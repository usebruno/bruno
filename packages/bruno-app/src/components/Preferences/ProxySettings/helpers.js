// Helper functions to handle new proxy format
const getProxyMode = (proxy) => {
  if (proxy === false) return 'off';
  if (proxy === 'system') return 'system';
  if (typeof proxy === 'object' && proxy !== null) return 'on';
  return 'off'; // default
};

const transformProxyForStorage = (values) => {
  if (values.mode === 'off') {
    return false;
  } else if (values.mode === 'system') {
    return 'system';
  } else if (values.mode === 'on') {
    // Return proxy object with configuration
    const { mode, ...proxyConfig } = values;
    return proxyConfig;
  }
  return false;
};

export {
  getProxyMode,
  transformProxyForStorage
};
