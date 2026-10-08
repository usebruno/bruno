import { AUTOCOMPLETE_SCOPES } from 'utils/common/constants';

// Color classes for the autocomplete dropdown's icons (see globalStyles.js). Scope names, icons and
// labels are shared with the variable popover: names and labels live in utils/common/constants, icons in ./scopeIcons.
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
