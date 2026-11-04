const { app, ipcMain } = require('electron');
const { aiCopilotStore } = require('../../store/ai-copilot');
const { oauthCredentialsStore } = require('../../store/oauth-credentials');
const { requestDeviceCode, pollForToken } = require('../../utils/github-device-flow');
const { listCopilotModels, stopCopilotRuntime } = require('./copilot-runtime');

const COPILOT_PROVIDER_ID = 'github-copilot';
const COPILOT_PROVIDER_LABEL = 'GitHub Copilot';
const COPILOT_MODEL_PREFIX = 'github-copilot:';

const COPILOT_OAUTH_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const COPILOT_OAUTH_SCOPE = 'read:user';

const GITHUB_API_URL = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 15000;

const NO_TOKEN_MESSAGE = 'Not signed in to GitHub Copilot. Sign in from Preferences > AI.';
const SESSION_EXPIRED_MESSAGE = 'GitHub Copilot sign-in is no longer valid. Sign in again from Preferences > AI.';
const TOKEN_REJECTED_MESSAGE = 'GitHub rejected this token. Use a fine-grained personal access token with the "Copilot Requests" permission.';

const isCopilotModelId = (id) => typeof id === 'string' && id.startsWith(COPILOT_MODEL_PREFIX);

const copilotBrunoModelId = (copilotModelId) => `${COPILOT_MODEL_PREFIX}${copilotModelId}`;

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

const accountError = async (response) => {
  if (response.status === 401) return new Error(SESSION_EXPIRED_MESSAGE);
  const body = await readJson(response);
  const reason = body?.message || body?.error_description;
  return new Error(reason
    ? `Failed to load the GitHub account: ${reason}`
    : `Failed to load the GitHub account (HTTP ${response.status})`);
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
    throw await accountError(response);
  }
  const data = await readJson(response);
  return {
    login: data?.login || '',
    name: data?.name || '',
    avatarUrl: data?.avatar_url || ''
  };
};

const resolveCopilotToken = () => {
  const credential = oauthCredentialsStore.getCredential(COPILOT_PROVIDER_ID);
  return credential?.token
    ? { token: credential.token, method: credential.method }
    : { token: null, method: null };
};

const getCopilotCatalog = () => {
  const session = aiCopilotStore.getSession();
  return { models: Array.isArray(session?.models) ? session.models : [] };
};

const findCopilotModel = (brunoModelId) => {
  if (!isCopilotModelId(brunoModelId)) return null;
  const copilotModelId = brunoModelId.slice(COPILOT_MODEL_PREFIX.length);
  return getCopilotCatalog().models.find((m) => m.modelId === copilotModelId) || null;
};

const stopRuntimeInBackground = () => {
  stopCopilotRuntime().catch((err) => console.warn('[AI] Failed to stop the Copilot runtime:', err.message));
};

let lastError = null;
let pendingSignIn = null;

const getCopilotState = () => {
  const { token, method } = resolveCopilotToken();
  let state = 'signed-out';
  if (pendingSignIn) state = 'signing-in';
  else if (token) state = 'signed-in';
  return {
    state,
    authMethod: token ? method : null,
    userCode: pendingSignIn?.userCode || null,
    verificationUri: pendingSignIn?.verificationUri || null,
    account: token ? aiCopilotStore.getSession()?.account || null : null,
    error: lastError
  };
};

const refreshModels = async () => {
  const { token } = resolveCopilotToken();
  if (!token) throw new Error(NO_TOKEN_MESSAGE);
  try {
    const account = await fetchAccount(token);
    aiCopilotStore.setSession({ account, models: [] });
    const models = await listCopilotModels(token);
    aiCopilotStore.setSession({ account, models });
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

const storeToken = (token, method) => {
  oauthCredentialsStore.setCredential(COPILOT_PROVIDER_ID, { token, method });
  aiCopilotStore.clearSession();
  stopRuntimeInBackground();
  lastError = null;
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
      storeToken(accessToken, 'device');
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

const saveToken = async (token) => {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (!trimmed) throw new Error('Token cannot be empty');
  cancelSignIn();
  storeToken(trimmed, 'pat');
  try {
    await refreshModels();
  } catch (err) {
    if (err.message !== SESSION_EXPIRED_MESSAGE && !err.tokenRefused) throw err;
    const message = err.tokenRefused ? err.message : TOKEN_REJECTED_MESSAGE;
    oauthCredentialsStore.clearCredential(COPILOT_PROVIDER_ID);
    aiCopilotStore.clearSession();
    stopRuntimeInBackground();
    lastError = message;
    throw new Error(message);
  }
};

const signOut = () => {
  cancelSignIn();
  oauthCredentialsStore.clearCredential(COPILOT_PROVIDER_ID);
  aiCopilotStore.clearSession();
  stopRuntimeInBackground();
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

  ipcMain.handle('renderer:ai-copilot-cancel-sign-in', async () => {
    cancelSignIn();
    return publish();
  });

  ipcMain.handle('renderer:ai-copilot-save-token', async (_event, { token } = {}) => {
    try {
      await saveToken(token);
    } finally {
      publish();
    }
    return buildStatus();
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

  app.on('will-quit', stopRuntimeInBackground);

  if (isAiEnabled() && resolveCopilotToken().token) {
    refreshModels()
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
  COPILOT_MODEL_PREFIX,
  NO_TOKEN_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  TOKEN_REJECTED_MESSAGE,
  isCopilotModelId,
  copilotBrunoModelId,
  resolveCopilotToken,
  getCopilotCatalog,
  findCopilotModel,
  getCopilotState,
  refreshModels,
  startSignIn,
  cancelSignIn,
  saveToken,
  signOut,
  registerCopilotIpc
};
