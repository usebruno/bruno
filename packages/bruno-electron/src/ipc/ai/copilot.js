const { app, ipcMain } = require('electron');
const { createOpenAI } = require('@ai-sdk/openai');
const { aiCopilotStore } = require('../../store/ai-copilot');
const { aiKeyStore } = require('../../store/ai-keys');
const { requestDeviceCode, pollForToken } = require('../../utils/github-device-flow');
const { readGitHubCliToken } = require('../../utils/github-cli');

const COPILOT_PROVIDER_ID = 'github-copilot';
const COPILOT_PROVIDER_LABEL = 'GitHub Copilot';
const COPILOT_MODEL_PREFIX = 'github-copilot:';

const COPILOT_OAUTH_CLIENT_ID = 'Ov23ligtAyHR3IYymS1u';
const COPILOT_OAUTH_SCOPE = 'read:user';
const GITHUB_CLI_SOURCE = 'github-cli';

const GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_COPILOT_API_ENDPOINT = 'https://api.githubcopilot.com';
const COPILOT_API_VERSION = '2025-10-01';
const REQUEST_TIMEOUT_MS = 15000;

const NO_TOKEN_MESSAGE = 'Not signed in to GitHub Copilot. Sign in from Preferences > AI.';
const SESSION_EXPIRED_MESSAGE = 'GitHub Copilot sign-in is no longer valid. Sign in again from Preferences > AI.';
const NO_ACCESS_MESSAGE = 'This GitHub account does not have access to Copilot. Ask your GitHub admin for a Copilot seat.';
const GITHUB_CLI_MISSING_MESSAGE = 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com, then try again.';
const GITHUB_CLI_SIGNED_OUT_MESSAGE = 'GitHub CLI is not signed in. Run "gh auth login" in a terminal, then try again.';

const isCopilotModelId = (id) => typeof id === 'string' && id.startsWith(COPILOT_MODEL_PREFIX);

const copilotBrunoModelId = (copilotModelId) => `${COPILOT_MODEL_PREFIX}${copilotModelId}`;

const editorHeaders = () => ({
  'Editor-Version': `Bruno/${app.getVersion()}`,
  'X-GitHub-Api-Version': COPILOT_API_VERSION
});

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

const responseErrorMessage = (body) => body?.error?.message || body?.message || body?.error_description;

const accessDeniedError = async (response) => {
  const reason = responseErrorMessage(await readJson(response));
  return new Error(reason ? `GitHub Copilot access denied: ${reason}` : NO_ACCESS_MESSAGE);
};

const readBodyText = async (response) => {
  try {
    return await response.text();
  } catch (err) {
    return '';
  }
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
};

const hostOf = (url) => {
  try {
    return new URL(url).host;
  } catch (err) {
    return url;
  }
};

const copilotHttpError = async (response, fallback) => {
  if (response.status === 401) return new Error(SESSION_EXPIRED_MESSAGE);
  if (response.status === 403) return accessDeniedError(response);
  const text = await readBodyText(response);
  const message = responseErrorMessage(parseJson(text));
  if (message) return new Error(`${fallback}: ${message}`);
  if (text) console.warn(`[AI] ${fallback} (HTTP ${response.status}) from ${response.url || 'unknown URL'}: ${text.slice(0, 500)}`);
  return new Error(`${fallback} (HTTP ${response.status})`);
};

const fetchAccount = async (token) => {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw await copilotHttpError(response, 'Failed to load the GitHub account');
  }
  const data = await readJson(response);
  return {
    login: data?.login || '',
    name: data?.name || '',
    avatarUrl: data?.avatar_url || ''
  };
};

const discoverApiEndpoint = async (token) => {
  try {
    const response = await fetch(`${GITHUB_API_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'query { viewer { copilotEndpoints { api } } }' }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const data = response.ok ? await readJson(response) : null;
    const api = data?.data?.viewer?.copilotEndpoints?.api;
    if (api) return api.replace(/\/+$/, '');
  } catch (err) {
    console.warn(`[AI] Copilot endpoint discovery failed, using ${DEFAULT_COPILOT_API_ENDPOINT}: ${err.message}`);
  }
  return DEFAULT_COPILOT_API_ENDPOINT;
};

const supportsReasoning = (model) => {
  const supports = model?.capabilities?.supports || {};
  return Boolean(supports.thinking)
    || Boolean(supports.adaptive_thinking)
    || Number.isFinite(supports.max_thinking_budget)
    || (Array.isArray(supports.reasoning_effort) && supports.reasoning_effort.length > 0);
};

const isStreamingChatModel = (model) => Boolean(model?.id)
  && model?.capabilities?.type === 'chat'
  && model?.capabilities?.supports?.streaming !== false
  && (!model.policy || model.policy.state === 'enabled');

const isOfferedByGitHub = (model) => model.policy?.state === 'enabled' || model.model_picker_enabled === true;

const toCatalogModel = (model) => {
  const multiplier = Number(model?.billing?.multiplier);
  const maxOutputTokens = Number(model?.capabilities?.limits?.max_output_tokens);
  return {
    modelId: model.id,
    label: model.name || model.id,
    reasoning: supportsReasoning(model),
    maxOutputTokens: Number.isFinite(maxOutputTokens) && maxOutputTokens > 0 ? maxOutputTokens : 0,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1
  };
};

const describeExcludedModel = (model) => [
  model?.id || '(no id)',
  `type=${model?.capabilities?.type}`,
  `picker=${model?.model_picker_enabled}`,
  `policy=${model?.policy?.state || 'none'}`,
  `streaming=${model?.capabilities?.supports?.streaming}`
].join(' ');

const preferredVariant = (current, candidate) => {
  if ((current.is_chat_default === true) !== (candidate.is_chat_default === true)) {
    return candidate.is_chat_default === true ? candidate : current;
  }
  if ((current.model_picker_enabled === true) !== (candidate.model_picker_enabled === true)) {
    return candidate.model_picker_enabled === true ? candidate : current;
  }
  return candidate.id.length < current.id.length ? candidate : current;
};

const oneVariantPerName = (models) => {
  const byName = new Map();
  for (const model of models) {
    const name = model.name || model.id;
    const current = byName.get(name);
    byName.set(name, current ? preferredVariant(current, model) : model);
  }
  return [...byName.values()];
};

const normalizeModelCatalog = (rawModels) => {
  const chatModels = (Array.isArray(rawModels) ? rawModels : []).filter(isStreamingChatModel);
  const offeredModels = chatModels.filter(isOfferedByGitHub);
  const usable = oneVariantPerName(offeredModels.length > 0 ? offeredModels : chatModels);
  const defaults = usable.filter((m) => m.is_chat_default === true);
  const rest = usable.filter((m) => m.is_chat_default !== true);
  return [...defaults, ...rest].map(toCatalogModel);
};

const fetchModels = async (token, apiEndpoint) => {
  const response = await fetch(`${apiEndpoint}/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...editorHeaders()
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    throw await copilotHttpError(response, `Failed to load Copilot models from ${hostOf(apiEndpoint)}`);
  }
  const body = await readJson(response);
  const rawModels = Array.isArray(body?.data) ? body.data : [];
  const models = normalizeModelCatalog(rawModels);
  if (models.length === 0) {
    console.warn(`[AI] Copilot returned ${rawModels.length} models from ${hostOf(apiEndpoint)} but none are usable: ${rawModels.map(describeExcludedModel).join('; ')}`);
  }
  return models;
};

let githubCliToken = null;

const usesGitHubCli = () => aiCopilotStore.getAuthSource() === GITHUB_CLI_SOURCE;

const resolveCopilotToken = () => usesGitHubCli()
  ? githubCliToken
  : aiKeyStore.getKey(COPILOT_PROVIDER_ID);

const loadGitHubCliToken = async () => {
  const { installed, token, startError } = await readGitHubCliToken();
  if (!installed) throw new Error(GITHUB_CLI_MISSING_MESSAGE);
  if (startError) throw new Error(`GitHub CLI (gh) could not be started: ${startError}`);
  if (!token) throw new Error(GITHUB_CLI_SIGNED_OUT_MESSAGE);
  return token;
};

const getCopilotCatalog = () => {
  const session = aiCopilotStore.getSession();
  return {
    apiEndpoint: session?.apiEndpoint || null,
    models: Array.isArray(session?.models) ? session.models : []
  };
};

const findCopilotModel = (brunoModelId) => {
  if (!isCopilotModelId(brunoModelId)) return null;
  const copilotModelId = brunoModelId.slice(COPILOT_MODEL_PREFIX.length);
  return getCopilotCatalog().models.find((m) => m.modelId === copilotModelId) || null;
};

const isUserInitiatedRequest = (body) => {
  if (typeof body !== 'string') return true;
  try {
    const { messages } = JSON.parse(body);
    const last = Array.isArray(messages) ? messages[messages.length - 1] : null;
    return !last || last.role === 'user';
  } catch (err) {
    return true;
  }
};

const MODEL_REFUSED_CODES = ['model_not_supported', 'model_not_available_for_integrator'];

const modelRefusedError = async (response, requestBody) => {
  const code = (await readJson(response.clone()))?.error?.code;
  if (!MODEL_REFUSED_CODES.includes(code)) return null;
  const modelId = typeof requestBody === 'string' ? parseJson(requestBody)?.model : null;
  const label = getCopilotCatalog().models.find((m) => m.modelId === modelId)?.label || modelId || 'this model';
  return new Error(`GitHub Copilot doesn't offer ${label} to this account. Choose another Copilot model, or turn this one off in Preferences > AI.`);
};

const copilotFetch = async (url, init = {}) => {
  const headers = new Headers(init.headers);
  if (!headers.has('X-Initiator')) {
    headers.set('X-Initiator', isUserInitiatedRequest(init.body) ? 'user' : 'agent');
  }
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  if (response.status === 403) {
    throw await accessDeniedError(response);
  }
  if (response.status === 400) {
    const refused = await modelRefusedError(response, init.body);
    if (refused) throw refused;
  }
  return response;
};

const createCopilotSdk = ({ token, apiEndpoint }) => createOpenAI({
  apiKey: token,
  baseURL: apiEndpoint,
  headers: {
    ...editorHeaders(),
    'OpenAI-Intent': 'conversation-panel',
    'X-Interaction-Type': 'conversation-panel'
  },
  fetch: copilotFetch
});

let lastError = null;
let pendingSignIn = null;

const reloadGitHubCliToken = async () => {
  try {
    githubCliToken = await loadGitHubCliToken();
  } catch (err) {
    githubCliToken = null;
    lastError = err.message;
    throw err;
  }
};

const getCopilotState = () => {
  const signedIn = Boolean(resolveCopilotToken());
  let state = 'signed-out';
  if (pendingSignIn) state = 'signing-in';
  else if (signedIn) state = 'signed-in';
  return {
    state,
    authSource: state === 'signed-in' && usesGitHubCli() ? GITHUB_CLI_SOURCE : null,
    userCode: pendingSignIn?.userCode || null,
    verificationUri: pendingSignIn?.verificationUri || null,
    account: signedIn ? aiCopilotStore.getSession()?.account || null : null,
    error: lastError
  };
};

const refreshModels = async () => {
  if (usesGitHubCli()) await reloadGitHubCliToken();
  const token = resolveCopilotToken();
  if (!token) throw new Error(NO_TOKEN_MESSAGE);
  try {
    const account = await fetchAccount(token);
    const sameAccount = aiCopilotStore.getSession()?.account?.login === account.login;
    const catalog = sameAccount ? getCopilotCatalog() : { apiEndpoint: null, models: [] };
    aiCopilotStore.setSession({ account, ...catalog });
    const apiEndpoint = await discoverApiEndpoint(token);
    const models = await fetchModels(token, apiEndpoint);
    aiCopilotStore.setSession({ account, apiEndpoint, models });
    lastError = null;
  } catch (err) {
    lastError = err.message;
    throw err;
  }
};

const cancelSignIn = () => {
  if (!pendingSignIn) return;
  pendingSignIn.controller.abort();
  pendingSignIn = null;
};

const storeToken = (token) => {
  aiKeyStore.setKey(COPILOT_PROVIDER_ID, token);
  aiCopilotStore.clearAuthSource();
  aiCopilotStore.clearSession();
  githubCliToken = null;
  lastError = null;
};

const signInWithGitHubCli = async () => {
  cancelSignIn();
  githubCliToken = await loadGitHubCliToken();
  aiKeyStore.clearKey(COPILOT_PROVIDER_ID);
  aiCopilotStore.clearSession();
  aiCopilotStore.setAuthSource(GITHUB_CLI_SOURCE);
  lastError = null;
  await refreshModels().catch(() => {});
};

const startSignIn = async ({ onSettled }) => {
  cancelSignIn();
  lastError = null;
  const device = await requestDeviceCode({ clientId: COPILOT_OAUTH_CLIENT_ID, scope: COPILOT_OAUTH_SCOPE });
  const controller = new AbortController();
  const attempt = { controller, userCode: device.userCode, verificationUri: device.verificationUri };
  pendingSignIn = attempt;

  pollForToken({
    clientId: COPILOT_OAUTH_CLIENT_ID,
    deviceCode: device.deviceCode,
    interval: device.interval,
    expiresIn: device.expiresIn,
    signal: controller.signal
  })
    .then(async ({ accessToken }) => {
      if (pendingSignIn !== attempt) return;
      pendingSignIn = null;
      storeToken(accessToken);
      await refreshModels().catch(() => {});
      onSettled();
    })
    .catch((err) => {
      if (pendingSignIn !== attempt) return;
      pendingSignIn = null;
      lastError = err.message;
      onSettled();
    });
};

const signOut = () => {
  cancelSignIn();
  aiKeyStore.clearKey(COPILOT_PROVIDER_ID);
  aiCopilotStore.clearAuthSource();
  aiCopilotStore.clearSession();
  githubCliToken = null;
  lastError = null;
};

const registerCopilotIpc = ({ buildStatus, broadcastStatus, clearSdkCache, isAiEnabled }) => {
  const publish = () => {
    clearSdkCache();
    const status = buildStatus();
    broadcastStatus(status);
    return status;
  };

  ipcMain.handle('renderer:ai-copilot-sign-in', async () => {
    await startSignIn({ onSettled: publish });
    return publish();
  });

  ipcMain.handle('renderer:ai-copilot-sign-in-with-github-cli', async () => {
    await signInWithGitHubCli();
    return publish();
  });

  ipcMain.handle('renderer:ai-copilot-cancel-sign-in', async () => {
    cancelSignIn();
    return publish();
  });

  ipcMain.handle('renderer:ai-copilot-refresh-models', async () => {
    try {
      await refreshModels();
    } finally {
      publish();
    }
    return buildStatus();
  });

  ipcMain.handle('renderer:ai-copilot-sign-out', async () => {
    signOut();
    return publish();
  });

  if (usesGitHubCli() || resolveCopilotToken()) {
    const restoreToken = usesGitHubCli() ? reloadGitHubCliToken() : Promise.resolve();
    restoreToken
      .then(() => (isAiEnabled() ? refreshModels() : null))
      .then(publish)
      .catch((err) => {
        console.warn('[AI] Copilot model refresh on startup failed:', err.message);
        publish();
      });
  }
};

module.exports = {
  COPILOT_PROVIDER_ID,
  COPILOT_PROVIDER_LABEL,
  NO_TOKEN_MESSAGE,
  isCopilotModelId,
  copilotBrunoModelId,
  resolveCopilotToken,
  getCopilotCatalog,
  findCopilotModel,
  createCopilotSdk,
  getCopilotState,
  refreshModels,
  registerCopilotIpc
};
