export {
  DEFAULT_SCHEME,
  getExplicitScheme,
  hasExplicitScheme,
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  stripOrigin,
  safeDecodeURIComponent,
  extractMockRoutePath,
  getMockResponseRouteKey,
  isSameOrigin
} from './url';

export {
  buildFormUrlEncodedPayload,
  isFormData,
  extractBoundaryFromContentType
} from './form-data';

export {
  patternHasher
} from './template-hasher';

export {
  PROMPT_VARIABLE_TEXT_PATTERN,
  PROMPT_VARIABLE_TEMPLATE_PATTERN,
  extractPromptVariables,
  extractPromptVariablesFromString
} from './prompt-variables';

export {
  jsonToDotenv,
  DotenvVariable
} from './jsonToDotenv';

export {
  parseValueByDataType,
  getDataTypeFromValue,
  validateDataTypeValue,
  valueToString,
  BrunoVariableDataType,
  BRUNO_VARIABLE_DATATYPES,
  isBrunoVariableDataType
} from './datatype';

export {
  toDisplayString
} from './string';

export {
  toBool,
  toNumber
} from './type-helpers';

export {
  MAX_BODY_SIZE_DEFAULT,
  isStrPresent,
  makeEdgeGridTimestamp,
  makeEdgeGridNonce,
  canonicalizeHeaders,
  base64HmacSha256,
  base64Sha256,
  makeContentHash
} from './edgegrid';

export const TIMEOUT_INHERIT = 'inherit' as const;

// Normalize a request timeout setting for serialization: keep the "inherit"
// sentinel and finite, positive numbers as-is; fall back to 0 for everything
// else (null/undefined, NaN, ±Infinity, zero, negatives, non-numeric values),
// since those don't serialize to a meaningful timeout.
export const resolveTimeoutSetting = (value: unknown): number | typeof TIMEOUT_INHERIT => {
  if (value === TIMEOUT_INHERIT) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return 0;
};
