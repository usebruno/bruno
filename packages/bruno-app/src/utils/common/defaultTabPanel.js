/**
 * Determines the default tab panel based on HTTP method
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
 * @returns {string} - Default tab panel ('params' or 'body')
 */
export const getDefaultTabPanelForHttpMethod = (method) => {
  if (!method || typeof method !== 'string') {
    return 'params'; // Default fallback
  }

  const normalizedMethod = method.toUpperCase();

  // GET and DELETE methods default to params tab
  if (['GET', 'DELETE'].includes(normalizedMethod)) {
    return 'params';
  }

  // POST, PUT, and PATCH methods default to body tab
  if (['POST', 'PUT', 'PATCH'].includes(normalizedMethod)) {
    return 'body';
  }

  // For other methods (HEAD, OPTIONS, TRACE, etc.), default to params
  return 'params';
};

/**
 * Determines the default tab panel for GraphQL requests
 * @returns {string} - Always returns 'query' for GraphQL requests
 */
export const getDefaultTabPanelForGraphQL = () => {
  return 'query';
};
