export const REQUEST_TYPES = ['http-request', 'graphql-request', 'grpc-request', 'ws-request'];

export const DEFAULT_COLLECTION_FORMAT = 'yml';

export const DEFAULT_SIDEBAR_WIDTH = 250;
export const DEFAULT_SIDEBAR_COLLAPSED = false;

export const PRESET_REQUEST_TYPES = {
  HTTP: 'http',
  GRAPHQL: 'graphql',
  GRPC: 'grpc',
  WS: 'ws'
};

export const DEFAULT_PRESET_REQUEST_TYPE = PRESET_REQUEST_TYPES.HTTP;

export const VARIABLE_ADD_SCOPES = {
  GLOBAL: 'global',
  ENVIRONMENT: 'environment',
  COLLECTION: 'collection',
  REQUEST: 'request',
  FOLDER: 'folder'
};

// Every scope a variable can be tagged with: the ones a variable can be added to, plus the
// read-only ones that exist only so a variable can show its icon and label.
export const AUTOCOMPLETE_SCOPES = {
  ...VARIABLE_ADD_SCOPES,
  RUNTIME: 'runtime',
  PROCESS_ENV: 'process.env',
  DYNAMIC: 'dynamic',
  OAUTH2: 'oauth2'
};

/**
 * Which keystrokes open the variable autocomplete dropdown in a field (passed as the editors'
 * `variableAutocomplete` prop). Ctrl+Space (the manual trigger) works in every mode.
 */
export const AUTOCOMPLETE_TRIGGER = {
  SINGLE_BRACE: 'singleBrace', // `{` opens it (and `{{` still does)
  DOUBLE_BRACE: 'doubleBrace', // only `{{` opens it
  OFF: 'off' // typing never opens the variable list
};

export const SCOPE_LABEL = {
  [AUTOCOMPLETE_SCOPES.REQUEST]: 'Request',
  [AUTOCOMPLETE_SCOPES.FOLDER]: 'Folder',
  [AUTOCOMPLETE_SCOPES.COLLECTION]: 'Collection',
  [AUTOCOMPLETE_SCOPES.ENVIRONMENT]: 'Environment',
  [AUTOCOMPLETE_SCOPES.GLOBAL]: 'Global',
  [AUTOCOMPLETE_SCOPES.RUNTIME]: 'Runtime',
  [AUTOCOMPLETE_SCOPES.PROCESS_ENV]: 'Process Env',
  [AUTOCOMPLETE_SCOPES.DYNAMIC]: 'Dynamic',
  [AUTOCOMPLETE_SCOPES.OAUTH2]: 'OAuth2'
};

export const AUTH_MODES = {
  AWSV4: 'awsv4',
  BASIC: 'basic',
  BEARER: 'bearer',
  DIGEST: 'digest',
  NTLM: 'ntlm',
  OAUTH1: 'oauth1',
  OAUTH2: 'oauth2',
  WSSE: 'wsse',
  APIKEY: 'apikey',
  NONE: 'none',
  INHERIT: 'inherit'
};

// Auth modes supported by WS protocol.
export const AUTH_MODES_WS = [
  AUTH_MODES.BASIC,
  AUTH_MODES.BEARER,
  AUTH_MODES.APIKEY,
  AUTH_MODES.OAUTH2,
  AUTH_MODES.NONE,
  AUTH_MODES.INHERIT
];

// Auth modes supported by GRPC protocol
export const AUTH_MODES_GRPC = [
  AUTH_MODES.BASIC,
  AUTH_MODES.BEARER,
  AUTH_MODES.APIKEY,
  AUTH_MODES.OAUTH2,
  AUTH_MODES.WSSE,
  AUTH_MODES.NONE,
  AUTH_MODES.INHERIT
];
