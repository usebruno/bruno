const { getSystemProxy } = require('@usebruno/requests');

let cachedSystemProxy;
let systemProxyPromise;

const loadSystemProxy = async () => {
  try {
    cachedSystemProxy = await getSystemProxy();
  } catch (error) {
    console.error('Failed to initialize system proxy:', error);
    cachedSystemProxy = {
      http_proxy: null,
      https_proxy: null,
      no_proxy: null,
      source: 'error'
    };
  }
  return cachedSystemProxy;
};

const fetchSystemProxy = ({ refresh = false } = {}) => {
  if (refresh || !systemProxyPromise) {
    systemProxyPromise = loadSystemProxy();
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
