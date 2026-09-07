export { mockDataFunctions, timeBasedDynamicVars } from './utils/faker-functions';
export { default as interpolate, interpolateObject } from './interpolate';
export { percentageToZoomLevel } from './zoom';
export { default as isRequestTagsIncluded } from './tags';
export { transformExampleStatusInCollection } from './example-status';
export { sortByNameThenSequence, resolveCollectionVersion } from './collection';
export { normalizeOpenApiSyncConfigs } from './openapi-sync';

export { generateApiDocsHtml, getApiDocsFileName } from './api-docs';
export type {
  GenerateApiDocsOptions,
  ApiDocsDependencies,
  ApiDocsHtmlOptions,
  ApiDocsMetadata,
  DocsCollection,
  DocsOpenCollection,
  TaggedItem,
  NamedEnvironment
} from './api-docs';
export { HTTP_SCRIPT_KEYS, GRPC_SCRIPT_KEYS, SCRIPT_TYPES } from './scripts';

export { buildHar } from './generate-code/har';
export type {
  BuildHarInput,
  BuildHarOutput,
  BrunoRequest,
  BrunoKV,
  BrunoBody,
  BrunoAuth,
  HarRequest,
  OAuth2CredentialRecord
} from './generate-code/har';

export {
  BRUNO_DEFAULT_HEADERS,
  getBrunoDefaultHeaderNames,
  applyOmitHeaders,
  shouldOmitConnection,
  refreshExplicitHeaderNames,
  getBrunoRuntimeUserAgent
} from './headers/default-headers';
export type {
  BrunoDefaultHeader,
  BrunoDefaultHeaderSource,
  ApplyOmitHeadersResult,
  OmitHeadersOptions
} from './headers/default-headers';

export * as utils from './utils';
export * from './constants';
