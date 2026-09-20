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
  FOCUS_DELAY: 100,
  SCROLL_BEHAVIOR: 'smooth',
  DEBOUNCE_DELAY: 350
};

export const DOCUMENTATION_RESULT = {
  type: SEARCH_TYPES.DOCUMENTATION,
  item: { id: 'docs', name: 'Bruno Documentation' },
  name: 'Bruno Documentation',
  path: '/',
  description: 'Browse the official Bruno documentation',
  matchType: MATCH_TYPES.DOCUMENTATION
};
