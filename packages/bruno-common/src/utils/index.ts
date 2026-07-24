export {
  hasExplicitScheme,
  encodeUrl,
  parseQueryParams,
  buildQueryString,
  stripOrigin,
  safeDecodeURIComponent
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

// Normalize a request timeout setting for serialization: keep numbers and the
// "inherit" sentinel as-is; fall back to 0 for anything else (null/undefined/invalid).
export const resolveTimeoutSetting = (value: unknown): number | typeof TIMEOUT_INHERIT =>
  typeof value === 'number' || value === TIMEOUT_INHERIT ? value : 0;
