export {
  buildQueryString, encodeUrl, hasExplicitScheme, parseQueryParams, safeDecodeURIComponent, stripOrigin
} from './url';

export {
  buildFormUrlEncodedPayload, extractBoundaryFromContentType, isFormData
} from './form-data';

export {
  patternHasher
} from './template-hasher';

export {
  extractPromptVariables,
  extractPromptVariablesFromString, PROMPT_VARIABLE_TEMPLATE_PATTERN, PROMPT_VARIABLE_TEXT_PATTERN
} from './prompt-variables';

export {
  DotenvVariable, jsonToDotenv
} from './jsonToDotenv';

export {
  BRUNO_VARIABLE_DATATYPES, BrunoVariableDataType, getDataTypeFromValue, isBrunoVariableDataType, parseValueByDataType, validateDataTypeValue,
  valueToString
} from './datatype';

export {
  toDisplayString
} from './string';

export const TIMEOUT_INHERIT = 'inherit' as const;

// Normalize a request timeout setting for serialization: keep numbers and the
// "inherit" sentinel as-is; fall back to 0 for anything else (null/undefined/invalid).
export const resolveTimeoutSetting = (value: unknown): number | typeof TIMEOUT_INHERIT =>
  typeof value === 'number' || value === TIMEOUT_INHERIT ? value : 0;
