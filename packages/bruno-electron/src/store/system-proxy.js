const { getSystemProxy } = require('@usebruno/requests');

let cachedSystemProxy = null;

const initializeSystemProxy = async () => {
  try {
    cachedSystemProxy = await getSystemProxy();
    return cachedSystemProxy;
  } catch (error) {
    console.error('Failed to initialize system proxy:', error);
    cachedSystemProxy = {
      http_proxy: null,
      https_proxy: null,
      no_proxy: null,
      source: 'error'
    };
    return cachedSystemProxy;
  }
};

const refreshSystemProxy = async () => {
  try {
    cachedSystemProxy = await getSystemProxy();
    return cachedSystemProxy;
  } catch (error) {
    console.error('Failed to refresh system proxy:', error);
    throw error;
  }
};

const getCachedSystemProxy = () => {
  return cachedSystemProxy;
};

module.exports = {
  initializeSystemProxy,
  refreshSystemProxy,
  getCachedSystemProxy
};
