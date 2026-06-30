export type BrunoVariableDataType = 'string' | 'number' | 'boolean' | 'object';

export const BRUNO_VARIABLE_DATATYPES: readonly BrunoVariableDataType[] = ['string', 'number', 'boolean', 'object'];

export const isBrunoVariableDataType = (t: unknown): t is BrunoVariableDataType =>
  typeof t === 'string' && (BRUNO_VARIABLE_DATATYPES as readonly string[]).includes(t);

// string-form → typed JS value, or raw on failure.
export const parseValueByDataType = (value: any, dataType?: BrunoVariableDataType): any => {
  if (!dataType || dataType === 'string') return value;
  try {
    if (dataType === 'number') {
      if (typeof value === 'number') return value;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed == null) return value;
      const num = Number(trimmed);
      if (!Number.isNaN(num)) return num;
    } else if (dataType === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
    } else if (dataType === 'object') {
      if (typeof value === 'object' && value !== null) return value;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed == null) return value;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === 'object') return parsed;
      } catch (_) {
        // not JSON — fall through
      }
    }
  } catch (_) {
    // fall through
  }
  return value;
};

// Strict typeof — used by bru.set* so JSON / numeric / boolean strings stay strings.
export const getDataTypeFromValue = (value: unknown): BrunoVariableDataType => {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
};

// Round-trip pair with parseValueByDataType.
export const valueToString = (value: unknown, indent?: number): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'function' || typeof value === 'symbol') return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, indent) ?? '';
    } catch (_) {
      return '';
    }
  }
  return String(value);
};

// Returns an error message when post-coerce value's JS type doesn't match dataType.
export const validateDataTypeValue = (value: any, dataType?: BrunoVariableDataType): string | null => {
  if (!dataType || dataType === 'string') return null;
  if (value === undefined || value === null) return null;

  if (dataType === 'number' && typeof value !== 'number') return `Value is not a valid ${dataType}`;
  if (dataType === 'boolean' && typeof value !== 'boolean') return `Value is not a valid ${dataType}`;
  if (dataType === 'object' && typeof value !== 'object') return `Value is not a valid ${dataType}`;

  return null;
};
