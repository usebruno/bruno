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

export const DEFAULT_MAX_REDIRECTS = 5;

// Parse a redirect ceiling: numbers of 0 or more pass with fractions truncated (0.9 becomes 0);
// anything else (negatives, non-numeric values, and NaN/±Infinity, which yml spells .nan/.inf
// and parses as real numbers) is unusable and yields undefined, leaving the caller to warn or
// fall back to a default. Strings aren't honoured, as with the timeout setting above, since yml
// types its scalars.
export const parseMaxRedirects = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.trunc(value);
};

export const toMaxRedirects = (value: unknown): number => parseMaxRedirects(value) ?? DEFAULT_MAX_REDIRECTS;
