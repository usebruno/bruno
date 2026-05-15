export const SEARCH_TYPES = {
  DOCUMENTATION: 'documentation',
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request'
};

export const MATCH_TYPES = {
  COLLECTION: 'collection',
  FOLDER: 'folder',
  REQUEST: 'request',
  URL: 'url',
  PATH: 'path',
  DOCUMENTATION: 'documentation'
};

export const SEARCH_CONFIG = {
  MAX_DEPTH: 20,
  FOCUS_DELAY: 100,
  SCROLL_BEHAVIOR: 'smooth',
  SCROLL_BLOCK: 'nearest',
  DEBOUNCE_DELAY: 300
};

/**
 * Get documentation result with translated strings
 * @param {Function} t - Translation function
 * @returns {Object} Documentation result object
 */
export const getDocumentationResult = (t) => ({
  type: SEARCH_TYPES.DOCUMENTATION,
  item: { id: 'docs', name: t('GLOBAL_SEARCH.DOCUMENTATION_NAME') },
  name: t('GLOBAL_SEARCH.DOCUMENTATION_NAME'),
  path: '/',
  description: t('GLOBAL_SEARCH.DOCUMENTATION_DESC'),
  matchType: MATCH_TYPES.DOCUMENTATION
});
