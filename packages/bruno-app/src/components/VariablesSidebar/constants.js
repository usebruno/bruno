import {
  IconAlertCircle,
  IconBolt,
  IconBox,
  IconDatabase,
  IconFolder,
  IconKey,
  IconSend,
  IconTerminal2,
  IconWorld
} from '@tabler/icons';

export const OBJECT_CELL_MAX_HEIGHT = '120px';

export const COPY_FEEDBACK_MS = 1200;
export const SCROLL_SAVE_DEBOUNCE_MS = 200;
export const SCROLL_RESTORE_MAX_MS = 2000;
export const SCROLL_RESTORE_STABLE_FRAMES = 20;
export const SCROLL_TOP_EPSILON = 5;
export const SCROLL_ZERO_ACCEPT_DELAY_MS = 75;

export const JSON_MODE = 'application/ld+json';

export const VARIABLE_REFERENCE_PATTERN = /\{\{([^}]+)\}\}/;

export const SCOPES = {
  UNDEFINED: 'undefined',
  RUNTIME: 'runtime',
  OAUTH2: 'oauth2',
  REQUEST: 'request',
  FOLDER: 'folder',
  ENVIRONMENT: 'environment',
  COLLECTION: 'collection',
  GLOBAL: 'global',
  PROCESS_ENV: 'process.env'
};

export const SCOPE_TITLES = {
  [SCOPES.UNDEFINED]: 'Not defined',
  [SCOPES.RUNTIME]: 'Runtime Variable',
  [SCOPES.OAUTH2]: 'OAuth2',
  [SCOPES.REQUEST]: 'Request Variable',
  [SCOPES.FOLDER]: 'Folder Variable',
  [SCOPES.ENVIRONMENT]: 'Collection Environment',
  [SCOPES.COLLECTION]: 'Collection Variable',
  [SCOPES.GLOBAL]: 'Global Environment',
  [SCOPES.PROCESS_ENV]: 'Process Env (.env)'
};

export const EDITABLE_SCOPES = [SCOPES.RUNTIME, SCOPES.REQUEST, SCOPES.FOLDER, SCOPES.ENVIRONMENT, SCOPES.COLLECTION, SCOPES.GLOBAL];

export const ADD_TO_SCOPE_ORDER = [SCOPES.REQUEST, SCOPES.FOLDER, SCOPES.COLLECTION, SCOPES.ENVIRONMENT, SCOPES.GLOBAL];

export const SCOPE_ICONS = {
  [SCOPES.UNDEFINED]: IconAlertCircle,
  [SCOPES.RUNTIME]: IconBolt,
  [SCOPES.OAUTH2]: IconKey,
  [SCOPES.REQUEST]: IconSend,
  [SCOPES.FOLDER]: IconFolder,
  [SCOPES.ENVIRONMENT]: IconDatabase,
  [SCOPES.COLLECTION]: IconBox,
  [SCOPES.GLOBAL]: IconWorld,
  [SCOPES.PROCESS_ENV]: IconTerminal2
};
