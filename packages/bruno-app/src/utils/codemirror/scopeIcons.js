import { AUTOCOMPLETE_SCOPES, VARIABLE_ADD_SCOPES } from 'utils/common/constants';

export const CHEVRON_ICON_SVG_TEXT = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6,9 12,15 18,9"></polyline>
</svg>
`;

// Collection Environment
export const DATABASE_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="6" rx="8" ry="3"></ellipse>
  <path d="M4 6v6a8 3 0 0 0 16 0v-6"></path>
  <path d="M4 12v6a8 3 0 0 0 16 0v-6"></path>
</svg>
`;

// Global Environment
export const WORLD_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"></circle>
  <line x1="3.6" y1="9" x2="20.4" y2="9"></line>
  <line x1="3.6" y1="15" x2="20.4" y2="15"></line>
  <path d="M11.5 3a17 17 0 0 0 0 18"></path>
  <path d="M12.5 3a17 17 0 0 1 0 18"></path>
</svg>
`;

// Request
export const SEND_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="10" y1="14" x2="21" y2="3"></line>
  <path d="M21 3l-6.5 18a0.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a0.55 .55 0 0 1 0 -1l18 -6.5"></path>
</svg>
`;

// Parent Folder
export const FOLDER_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"></path>
</svg>
`;

// Collection variable
export const BOX_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
  <line x1="12" y1="12" x2="20" y2="7.5"></line>
  <line x1="12" y1="12" x2="12" y2="21"></line>
  <line x1="12" y1="12" x2="4" y2="7.5"></line>
</svg>
`;

// Runtime variable
export const BOLT_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="13 3 4 14 12 14 11 21 20 10 12 10 13 3"></polyline>
</svg>
`;

// process.env variable
export const TERMINAL_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
  <path d="M8 9l3 3l-3 3"></path>
  <line x1="13" y1="15" x2="16" y2="15"></line>
</svg>
`;

// Dynamic / mock (built-in faker) variable
export const DOLLAR_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="1" x2="12" y2="23"></line>
  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
</svg>
`;

// OAuth2 credential variable (e.g. $oauth2.<credentialsId>.<key>)
export const KEY_ICON_SVG_TEXT = `
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="7" cy="15" r="4"></circle>
  <line x1="10.5" y1="11.5" x2="20" y2="2"></line>
  <line x1="15" y1="7" x2="18" y2="10"></line>
  <line x1="18" y1="4" x2="21" y2="7"></line>
</svg>
`;

// these scopes are there just to show icons and label.
export const READ_ONLY_SCOPE_ICON = {
  [AUTOCOMPLETE_SCOPES.RUNTIME]: BOLT_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.PROCESS_ENV]: TERMINAL_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.DYNAMIC]: DOLLAR_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.OAUTH2]: KEY_ICON_SVG_TEXT
};

export const SCOPE_ICON = {
  [VARIABLE_ADD_SCOPES.REQUEST]: SEND_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.FOLDER]: FOLDER_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.COLLECTION]: BOX_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: DATABASE_ICON_SVG_TEXT,
  [VARIABLE_ADD_SCOPES.GLOBAL]: WORLD_ICON_SVG_TEXT,
  ...READ_ONLY_SCOPE_ICON
};
