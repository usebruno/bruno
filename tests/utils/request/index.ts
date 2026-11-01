// Moved to playwright/pages/. Re-exported here for existing imports.
export { buildRequestLocators } from '../../../playwright/pages/request/pane';
export { buildNewRequestLocators, createRequestFromCurl } from '../../../playwright/pages/request/create';
export type { CreateRequestFromCurlOptions } from '../../../playwright/pages/request/create';
export { fillRequestHeaderName, fillRequestHeaderValue, showInheritedHeaders, seedCollectionHeaders, seedFolderHeaders } from '../../../playwright/pages/request/headers';
export { readResponsePreviewBody } from '../../../playwright/pages/response';
export { setApiKeyValue } from '../../../playwright/pages/request/auth';
