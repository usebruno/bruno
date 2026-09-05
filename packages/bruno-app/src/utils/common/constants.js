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

export const CHEVRON_ICON_SVG_TEXT = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6,9 12,15 18,9"></polyline>
</svg>
`;

// Collection Environment
const DATABASE_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="6" rx="8" ry="3"></ellipse>
  <path d="M4 6v6a8 3 0 0 0 16 0v-6"></path>
  <path d="M4 12v6a8 3 0 0 0 16 0v-6"></path>
</svg>
`;

// Global Environment
const WORLD_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"></circle>
  <line x1="3.6" y1="9" x2="20.4" y2="9"></line>
  <line x1="3.6" y1="15" x2="20.4" y2="15"></line>
  <path d="M11.5 3a17 17 0 0 0 0 18"></path>
  <path d="M12.5 3a17 17 0 0 1 0 18"></path>
</svg>
`;

// Request
const SEND_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="10" y1="14" x2="21" y2="3"></line>
  <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5"></path>
</svg>
`;

// Parent Folder
const FOLDER_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"></path>
</svg>
`;

// Collection variable
const BOX_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
  <line x1="12" y1="12" x2="20" y2="7.5"></line>
  <line x1="12" y1="12" x2="12" y2="21"></line>
  <line x1="12" y1="12" x2="4" y2="7.5"></line>
</svg>
`;

export const SCOPE_ICON = {
  [VARIABLE_ADD_SCOPES.REQUEST]: SEND_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.FOLDER]: FOLDER_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.COLLECTION]: BOX_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: DATABASE_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.GLOBAL]: WORLD_ICON_SVG_TEXT
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
