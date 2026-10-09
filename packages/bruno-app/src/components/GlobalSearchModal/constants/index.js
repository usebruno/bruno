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
  // while the search index is building: at most one index query per this window
  INDEX_THROTTLE_DELAY: 3000,
  // a hair longer than the throttle window, so a refresh tick never lands just inside it and gets dropped
  INDEX_REFRESH_INTERVAL: 3100
};

export const DOCUMENTATION_RESULT = {
  type: SEARCH_TYPES.DOCUMENTATION,
  item: { id: 'docs', name: 'Bruno Documentation' },
  name: 'Bruno Documentation',
  path: '/',
  description: 'Browse the official Bruno documentation',
  matchType: MATCH_TYPES.DOCUMENTATION
};
