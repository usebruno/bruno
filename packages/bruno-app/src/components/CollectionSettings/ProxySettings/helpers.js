// Helper function to get enabled value for form display
const getProxyMode = (proxyConfig) => {
  // Handle new format
  if (proxyConfig === false) return 'off';
  if (proxyConfig === 'inherit') return 'inherit';
  if (typeof proxyConfig === 'object' && proxyConfig !== null && !proxyConfig.hasOwnProperty('enabled')) return 'on';

  // Handle legacy format for backward compatibility
  if (proxyConfig && proxyConfig.enabled === true) return 'on';
  if (proxyConfig && proxyConfig.enabled === false) return 'off';
  if (proxyConfig && proxyConfig.enabled === 'global') return 'inherit';

  // Default
  return 'inherit';
};

// Helper function to transform form values to storage format
const transformProxyForStorage = (values) => {
  if (values.mode === 'off') {
    return false;
  } else if (values.mode === 'inherit') {
    return 'inherit';
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
