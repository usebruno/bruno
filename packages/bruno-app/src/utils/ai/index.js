import get from 'lodash/get';
import { callIpc } from 'utils/common/ipc';
import {
  findEnvironmentInCollection,
  flattenItems,
  getAllVariables,
  getFormattedCollectionOauth2Credentials,
  isItemAFolder,
  isItemARequest,
  sortItemsBySidebarOrder
} from 'utils/collections';

/**
 * Renderer-side wrapper around the AI IPC channels.
 *
 * The renderer never sees raw API keys, set/clear operations are write-only
 * and status reads only return whether a provider has a key on disk.
 */

export const getAiStatus = () => callIpc('renderer:get-ai-status');

export const setAiApiKey = ({ providerId, apiKey }) =>
  callIpc('renderer:set-ai-api-key', { providerId, apiKey });

export const clearAiApiKey = ({ providerId }) =>
  callIpc('renderer:clear-ai-api-key', { providerId });

export const getAiApiKey = ({ providerId }) =>
  callIpc('renderer:get-ai-api-key', { providerId });

export const testAiProvider = ({ providerId }) =>
  callIpc('renderer:ai-test-provider', { providerId });

export const aiGenerateText = (params) =>
  callIpc('renderer:ai-generate-text', params);

export const aiGenerateScript = (params) =>
  callIpc('renderer:ai-generate-script', params);

export const stopAiGeneration = (streamId) => {
  const { ipcRenderer } = window;
  if (ipcRenderer && streamId) {
    ipcRenderer.send('renderer:ai-stop-stream', { streamId });
  }
};

export const aiAutocomplete = (params) =>
  callIpc('renderer:ai-autocomplete', params);

export const cancelAiAutocomplete = (requestId) => {
  const { ipcRenderer } = window;
  if (ipcRenderer && requestId) {
    ipcRenderer.send('renderer:ai-autocomplete-cancel', { requestId });
  }
};

/**
 * Lean request context - method/url/headers/params/body. Kept for callers
 * that don't need the response (autocomplete + legacy sparkle sites).
 *
 * Sensitive header/param values are NOT stripped here — that happens in the
 * backend formatter via `maskValue`. The renderer ships them verbatim so the
 * mask logic stays in one place (packages/bruno-electron/src/ipc/ai/context.js).
 */
export const buildRequestContextFromItem = (item) => {
  if (!item) return null;
  const req = item.draft ? item.draft.request : item.request;
  if (!req) return null;

  return {
    url: req.url || '',
    method: req.method || 'GET',
    headers: Array.isArray(req.headers) ? req.headers : [],
    params: Array.isArray(req.params) ? req.params : [],
    body: req.body || null
  };
};

/**
 * Extended request context for chat + generation: adds the request's docs
 * field and the last response. The response is redacted shape-only on the
 * backend before being formatted into the prompt.
 */
export const buildAiRequestContext = (item) => {
  if (!item) return null;
  const req = item.draft ? item.draft.request : item.request;
  if (!req) return null;

  return {
    url: req.url || '',
    method: req.method || 'GET',
    headers: Array.isArray(req.headers) ? req.headers : [],
    params: Array.isArray(req.params) ? req.params : [],
    body: req.body || null,
    docs: req.docs || null,
    responseStatus: get(item, 'response.status', null),
    responseData: get(item, 'response.data', null)
  };
};

/**
 * Sensitive name patterns kept in sync with the backend (context.js). The
 * renderer uses these to redact secret values BEFORE sending over IPC so the
 * payload itself never carries them — a belt-and-suspenders measure on top
 * of the backend masking.
 */
const SENSITIVE_NAME_PATTERNS = [
  /api[_-]?key/i,
  // Catches refresh_token, id_token, csrfToken, plain TOKEN, etc. on top of
  // the specific access/auth-token forms below.
  /token/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /secret/i,
  /password/i,
  /^authorization$/i,
  /^cookie$/i
];

const isSensitiveName = (name) => {
  if (!name) return false;
  return SENSITIVE_NAME_PATTERNS.some((re) => re.test(name));
};

/**
 * Flat list of variables the model can search. Each entry:
 *   { name, value, scope, secret }
 *
 * Values come from `getAllVariables()` so they match what `bru.*` returns at
 * runtime - important because the model's `search_variables` tool would
 * otherwise show a lower-precedence value for any name that's overridden by
 * a higher-precedence scope (e.g. a folder var hiding behind an env var).
 *
 * Scope + secret metadata is attached by walking each named source. A name
 * marked secret by ANY source stays secret in the output.
 *
 * Redaction mirrors the backend's `isSecretVariable`:
 * - Variables EXPLICITLY marked secret (env `secret` flag, globalEnvSecrets,
 *   OAuth2 creds) are ALWAYS redacted, regardless of the toggle.
 * - Names that only LOOK secret by pattern are redacted only when
 *   `redactVariables` (the "Redact secret variable values" setting) is on.
 *
 * `redactVariables` is read live from the store so call sites don't have to
 * thread it; `redactVariablesOverride` lets tests drive both states.
 */
export const buildAiVariablesPayload = (collection, item, redactVariablesOverride) => {
  if (!collection) return [];

  // Lazy-require the store so merely importing this module (widely done via
  // aiGhostText / CodeEditor / AIAssist) doesn't pull in providers/ReduxStore.
  const redactVariables = redactVariablesOverride === undefined
    ? get(require('providers/ReduxStore').default.getState(), 'app.preferences.ai.security.redactVariables', true)
    : redactVariablesOverride;

  const REDACTED = '<redacted>';

  // Authoritative values - same merge `bru.getEnvVar` / `bru.getVar` resolve.
  const resolved = getAllVariables(collection, item) || {};

  // name -> { scope, secret } - last claim wins for scope (matches the spread
  // order in getAllVariables); secret is sticky-on once any source flags it.
  const meta = new Map();
  const claim = (name, scope, secret) => {
    if (!name) return;
    const existing = meta.get(name);
    const finalSecret = Boolean(secret) || Boolean(existing?.secret);
    meta.set(name, { scope, secret: finalSecret });
  };

  // Global env - secrets tracked as a separate name list.
  const globalSecrets = new Set(collection.globalEnvSecrets || []);
  for (const name of Object.keys(collection.globalEnvironmentVariables || {})) {
    claim(name, 'global', globalSecrets.has(name));
  }

  // Active environment - explicit `secret` flag per variable.
  const env = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  if (env && Array.isArray(env.variables)) {
    for (const v of env.variables) {
      if (v?.name && v.enabled) claim(v.name, 'env', Boolean(v.secret));
    }
  }

  // Runtime - set via bru.setVar() at runtime. No secret flag.
  for (const name of Object.keys(collection.runtimeVariables || {})) {
    claim(name, 'runtime', false);
  }

  // OAuth2 credentials — always treat as secret. `getAllVariables` already
  // surfaces these via the same helper, so claiming here just stamps the
  // right scope/secret on names that would otherwise default to 'collection'.
  const oauth = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
  if (oauth) {
    for (const name of Object.keys(oauth)) {
      claim(name, 'oauth2', true);
    }
  }

  const out = [];
  for (const name of Object.keys(resolved)) {
    if (name === 'pathParams' || name === 'maskedEnvVariables' || name === 'process') continue;
    const m = meta.get(name);
    // Default scope for names not claimed by any explicit source — these come
    // from collection/folder/request-level vars that don't carry a secret
    // flag of their own, so we rely on `isSensitiveName` to catch token-like
    // names by pattern (only when the redact toggle is on).
    const scope = m?.scope || 'collection';
    const isSecret = Boolean(m?.secret) || (redactVariables && isSensitiveName(name));
    const value = resolved[name];
    out.push({
      name,
      value: isSecret ? REDACTED : (value == null ? '' : String(value)),
      scope,
      secret: isSecret
    });
  }
  return out;
};

/**
 * Single entry point for chat + generation. Returns the same payload shape
 * for both so the backend formatters / tools behave identically.
 */
export const buildAiContextPayload = (item, collection, redactVariablesOverride) => ({
  requestContext: buildAiRequestContext(item),
  variables: collection ? buildAiVariablesPayload(collection, item, redactVariablesOverride) : []
});

const summarizeDocsItems = (items = []) => {
  const folders = [];
  const requests = [];

  for (const item of sortItemsBySidebarOrder(items)) {
    if (item.isTransient) continue;

    if (isItemAFolder(item)) {
      const nestedItems = item.items || [];
      const nestedRequests = nestedItems.filter((i) => isItemARequest(i) && !i.isTransient);
      const nestedFolders = nestedItems.filter((i) => isItemAFolder(i) && !i.isTransient);
      folders.push({
        name: item.name,
        requestCount: nestedRequests.length,
        subfolderCount: nestedFolders.length
      });
      continue;
    }

    if (isItemARequest(item)) {
      const req = item.draft?.request || item.request;
      requests.push({
        name: item.name,
        method: req?.method || 'GET',
        url: req?.url || '',
        type: item.type
      });
    }
  }

  return { folders, requests };
};

export const buildDocsContextFromCollection = (collection) => {
  if (!collection) return null;

  const { folders, requests } = summarizeDocsItems(collection.items || []);

  return {
    scope: 'collection',
    name: collection.name || '',
    folders,
    requests
  };
};

export const buildDocsContextFromFolder = (collection, folder) => {
  if (!folder) return null;

  const { folders, requests } = summarizeDocsItems(folder.items || []);

  return {
    scope: 'folder',
    name: folder.name || '',
    collectionName: collection?.name || '',
    folders,
    requests
  };
};

// Variable scopes the autocomplete model is told about. We ship NAMES only —
// values stay on the client. The model uses these to pick real keys for
// bru.getEnvVar / bru.getVar / bru.interpolate instead of inventing placeholders.
const SKIPPED_VAR_KEYS = new Set(['pathParams', 'maskedEnvVariables', 'process']);

const namesFrom = (obj) => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter((k) => !SKIPPED_VAR_KEYS.has(k));
};

/**
 * Build the variable-name lists the model will see. We don't separate by
 * scope on the client because `getAllVariables` already merges them — the
 * model just needs the union of names to pick from.
 */
const collectVariableNames = (collection, item) => {
  const all = getAllVariables(collection, item);
  const names = namesFrom(all);
  const processEnv = all?.process?.env ? Object.keys(all.process.env) : [];
  return {
    variables: names,
    processEnv: processEnv
  };
};

/**
 * Last N non-empty sibling scripts of the same type in the collection,
 * excluding the current item. Used as style/idiom reference for the model.
 */
const collectSiblingScripts = (collection, currentItem, scriptType, maxCount = 3) => {
  if (!collection || !scriptType) return [];

  const all = flattenItems(collection.items || []);
  const out = [];
  for (const it of all) {
    if (!isItemARequest(it)) continue;
    if (currentItem && it.uid === currentItem.uid) continue;

    const req = it.draft ? it.draft.request : it.request;
    if (!req) continue;

    let script;
    if (scriptType === 'tests') script = req.tests;
    else if (scriptType === 'pre-request') script = req.script?.req;
    else if (scriptType === 'post-response') script = req.script?.res;

    if (typeof script === 'string' && script.trim().length > 0) {
      out.push({ name: it.name, type: scriptType, script });
      // Sliding window of the most-recent N. flattenItems walks the tree
      // top-to-bottom so shifting from the front keeps the last N matches.
      if (out.length > maxCount) out.shift();
    }
  }
  return out;
};

/**
 * Build everything the autocomplete IPC needs about the current request +
 * its collection environment. Called per request from the editor.
 */
export const buildAutocompleteContext = ({ item, collection, scriptType }) => {
  return {
    requestContext: item ? buildRequestContextFromItem(item) : null,
    variableNames: collection ? collectVariableNames(collection, item) : null,
    siblingScripts: collection ? collectSiblingScripts(collection, item, scriptType) : []
  };
};

/**
 * Start a streaming generation. Subscribes to the corresponding `main:ai-stream-*`
 * channels filtered by streamId. Returns a handle with `.stop()` and a promise
 * that resolves with the final text or rejects on error.
 */
export const aiStreamText = (params, handlers = {}) => {
  const { ipcRenderer } = window;
  if (!ipcRenderer) {
    return { stop: () => {}, done: Promise.reject(new Error('IPC not available')) };
  }

  const streamId = params.streamId || `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const subs = [];

  const done = new Promise((resolve, reject) => {
    const cleanup = () => subs.forEach((unsub) => unsub());

    const onMatch = (channel, handler) => {
      const unsub = ipcRenderer.on(channel, (payload) => {
        if (payload?.streamId !== streamId) return;
        handler(payload);
      });
      subs.push(unsub);
    };

    onMatch('main:ai-stream-chunk', (payload) => {
      handlers.onChunk?.(payload);
    });
    onMatch('main:ai-stream-complete', (payload) => {
      handlers.onComplete?.(payload);
      cleanup();
      resolve(payload);
    });
    onMatch('main:ai-stream-stopped', (payload) => {
      handlers.onStopped?.(payload);
      cleanup();
      resolve(payload);
    });
    onMatch('main:ai-stream-error', (payload) => {
      handlers.onError?.(payload);
      cleanup();
      reject(new Error(payload.error));
    });
  });

  ipcRenderer.send('renderer:ai-stream-text', { ...params, streamId });

  return {
    streamId,
    stop: () => ipcRenderer.send('renderer:ai-stop-stream', { streamId }),
    done
  };
};
