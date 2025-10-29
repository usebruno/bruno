/**
 * Get parsed WebSocket URL object
 * @param {string} url - The WebSocket URL
 * @returns {Object} Parsed URL object with protocol, host, path
 */
export const getParsedWsUrlObject = (url) => {
  const addProtocolIfMissing = (str) => {
    if (str.includes('://')) return str;

    // For localhost, default to insecure (grpc://) for local development
    if (str.includes('localhost') || str.includes('127.0.0.1')) {
      return `ws://${str}`;
    }

    // For other hosts, default to secure
    return `wss://${str}`;
  };

  const removeTrailingSlash = (str) => (str.endsWith('/') ? str.slice(0, -1) : str);

  if (!url) return { host: '', path: '' };

  try {
    const urlObj = new URL(addProtocolIfMissing(url));
    return {
      protocol: urlObj.protocol,
      host: urlObj.host,
      path: removeTrailingSlash(urlObj.pathname),
      search: urlObj.search,
      fullUrl: urlObj.href
    };
  } catch (err) {
    console.error({ err });
    return {
      host: '',
      path: ''
    };
  }
};
