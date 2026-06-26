import { callIpc } from 'utils/common/ipc';
import {
  flattenItems,
  getAllVariables,
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

export const aiAutocomplete = (params) =>
  callIpc('renderer:ai-autocomplete', params);

export const cancelAiAutocomplete = (requestId) => {
  const { ipcRenderer } = window;
  if (ipcRenderer && requestId) {
    ipcRenderer.send('renderer:ai-autocomplete-cancel', { requestId });
  }
};

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
