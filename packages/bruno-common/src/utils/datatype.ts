export type BrunoVariableDatatype = 'string' | 'number' | 'boolean' | 'object';

export const BRUNO_VARIABLE_DATATYPES: readonly BrunoVariableDatatype[] = ['string', 'number', 'boolean', 'object'];

export const isBrunoVariableDatatype = (t: unknown): t is BrunoVariableDatatype =>
  typeof t === 'string' && (BRUNO_VARIABLE_DATATYPES as readonly string[]).includes(t);

// string-form → typed JS value, or raw on failure.
export const parseValueByDatatype = (value: any, datatype?: BrunoVariableDatatype): any => {
  if (!datatype || datatype === 'string') return value;
  try {
    if (datatype === 'number') {
      if (typeof value === 'number') return value;
      const trimmed = typeof value === 'string' ? value.trim() : value;
      if (trimmed === '' || trimmed == null) return value;
      const num = Number(trimmed);
      if (!Number.isNaN(num)) return num;
    } else if (datatype === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
    } else if (datatype === 'object') {
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
export const getDatatypeFromValue = (value: unknown): BrunoVariableDatatype => {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
};

// Round-trip pair with parseValueByDatatype.
export const valueToString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'function' || typeof value === 'symbol') return '';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? '';
    } catch (_) {
      return '';
    }
  }
  return String(value);
};

// Returns an error message when post-coerce value's JS type doesn't match datatype.
export const validateDatatypeValue = (value: any, datatype?: BrunoVariableDatatype): string | null => {
  if (!datatype || datatype === 'string') return null;
  if (value === undefined || value === null) return null;

  if (datatype === 'number' && typeof value !== 'number') return `Value is not a valid ${datatype}`;
  if (datatype === 'boolean' && typeof value !== 'boolean') return `Value is not a valid ${datatype}`;
  if (datatype === 'object' && typeof value !== 'object') return `Value is not a valid ${datatype}`;

  return null;
};
