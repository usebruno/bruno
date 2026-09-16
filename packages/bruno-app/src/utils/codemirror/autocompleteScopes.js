import {
  SEND_ICON_SVG_TEXT,
  FOLDER_ICON_SVG_TEXT,
  BOX_ICON_SVG_TEXT,
  DATABASE_ICON_SVG_TEXT,
  WORLD_ICON_SVG_TEXT,
  READ_ONLY_SCOPE_ICON
} from 'utils/common/constants';

/**
 * Scope metadata (icon, label, color class) for the variable autocomplete dropdown.
 *
 * The icon markup (including READ_ONLY_SCOPE_ICON, the runtime/process.env/dynamic/oauth2
 * icon pairing) is imported from utils/common/constants — the single source of truth also
 * used by the variable tooltip and the "Add to" scope switcher — so all three stay visually
 * in sync automatically. AUTOCOMPLETE_SCOPES, SCOPE_LABEL and SCOPE_ICON_COLOR_CLASS below
 * stay autocomplete-only: nothing else in the app reads them.
 */

// Scope keys used by the autocomplete dropdown. Deliberately not
// utils/common/constants's VARIABLE_ADD_SCOPES: that enum only covers the 5 scopes the
// "Add to" selector can create (request/folder/collection/environment/global). Autocomplete
// also needs to represent scopes that were never addable there — runtime, process.env,
// dynamic and oauth2 — so it keeps its own full list instead of extending someone else's.
export const AUTOCOMPLETE_SCOPES = {
  REQUEST: 'request',
  FOLDER: 'folder',
  COLLECTION: 'collection',
  ENVIRONMENT: 'environment',
  GLOBAL: 'global',
  RUNTIME: 'runtime',
  PROCESS_ENV: 'process.env',
  DYNAMIC: 'dynamic',
  OAUTH2: 'oauth2'
};

export const SCOPE_ICON = {
  [AUTOCOMPLETE_SCOPES.REQUEST]: SEND_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.FOLDER]: FOLDER_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.COLLECTION]: BOX_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.ENVIRONMENT]: DATABASE_ICON_SVG_TEXT,
  [AUTOCOMPLETE_SCOPES.GLOBAL]: WORLD_ICON_SVG_TEXT,
  ...READ_ONLY_SCOPE_ICON
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

export const SCOPE_ICON_COLOR_CLASS = {
  [AUTOCOMPLETE_SCOPES.REQUEST]: 'request',
  [AUTOCOMPLETE_SCOPES.FOLDER]: 'folder',
  [AUTOCOMPLETE_SCOPES.COLLECTION]: 'collection',
  [AUTOCOMPLETE_SCOPES.ENVIRONMENT]: 'environment',
  [AUTOCOMPLETE_SCOPES.GLOBAL]: 'global',
  [AUTOCOMPLETE_SCOPES.RUNTIME]: 'runtime',
  [AUTOCOMPLETE_SCOPES.PROCESS_ENV]: 'process-env',
  [AUTOCOMPLETE_SCOPES.DYNAMIC]: 'dynamic',
  [AUTOCOMPLETE_SCOPES.OAUTH2]: 'oauth2'
};
