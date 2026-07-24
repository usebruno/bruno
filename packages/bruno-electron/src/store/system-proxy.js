const { getSystemProxy, fetchShellEnv } = require('@usebruno/requests');

const PROXY_ENV_KEYS = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY', 'all_proxy', 'ALL_PROXY'];
// Keep this short: Preferences → Refresh blocks the UI on this race, and a
// hung login-shell fetch (common in CI/Electron e2e) must not sit for a minute.
const TIMEOUT_MS = 5_000;

let cachedSystemProxy;
let systemProxyPromise;

// Re-syncs proxy-related process.env values from the user's shell config, without restarting the app.
// ponytail: proxy vars are cleared before spawning the shell (not after fetching) because the child
// process inherits process.env — a removed .zshrc export would otherwise still be echoed back as "current".
const refreshShellEnvProxyVars = async () => {
  if (process.platform === 'win32') return {};

  const snapshot = {};
  for (const key of PROXY_ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), TIMEOUT_MS);
  });
  const result = await Promise.race([fetchShellEnv(), timeout]).finally(() => clearTimeout(timer));

  if (result === null) {
    for (const key of PROXY_ENV_KEYS) {
      if (snapshot[key] !== undefined) process.env[key] = snapshot[key];
    }
    return {};
  }

  for (const key of PROXY_ENV_KEYS) {
    if (result[key]) process.env[key] = result[key];
  }
  return result;
};

const loadSystemProxy = async ({ refreshShellEnv = false } = {}) => {
  try {
    if (refreshShellEnv) {
      await refreshShellEnvProxyVars();
    }
    cachedSystemProxy = await getSystemProxy();
  } catch (error) {
    console.error('Failed to initialize system proxy:', error);
    cachedSystemProxy = {
      http_proxy: null,
      https_proxy: null,
      no_proxy: null,
      pac_url: null,
      source: 'error'
    };
  }
  return cachedSystemProxy;
};

const fetchSystemProxy = ({ refresh = false } = {}) => {
  if (refresh || !systemProxyPromise) {
    systemProxyPromise = loadSystemProxy({ refreshShellEnv: refresh });
  }
  return systemProxyPromise;
};

const getCachedSystemProxy = async () => {
  if (!systemProxyPromise) {
    await fetchSystemProxy();
  } else {
    await systemProxyPromise;
  }
  return cachedSystemProxy;
};

module.exports = {
  fetchSystemProxy,
  getCachedSystemProxy
};
