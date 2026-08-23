export type BrunoVariableDataType = 'string' | 'number' | 'boolean' | 'object';

export const BRUNO_VARIABLE_DATATYPES: readonly BrunoVariableDataType[] = ['string', 'number', 'boolean', 'object'];

export const isBrunoVariableDataType = (t: unknown): t is BrunoVariableDataType =>
  typeof t === 'string' && (BRUNO_VARIABLE_DATATYPES as readonly string[]).includes(t);

const getByPath = (obj: Record<string, any>, path: string): any => {
  if (obj == null) return undefined;
  // Prefer a literal dotted key over walking the path — a variable named
  // `foo.bar` outranks `foo` → `bar` when both exist.
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

// Resolves a whole-string `{{reference}}` to the referenced variable's raw JS
// value. Returns `undefined` when the value isn't a whole reference, the
// resolvableVariables map is missing, or the referenced name isn't present —
// the caller then falls through to normal coercion.
//
// Recommended composition at call sites:
//   const resolved = resolveReference(value, vars);
//   const effective = resolved !== undefined ? resolved : parseValueByDataType(value, dataType);
//
// The ternary — not a fused parseValueByDataType(value, dataType, vars) — is what
// keeps a resolved value from being re-coerced (e.g. a resolved JSON-shaped
// string stays a string instead of being JSON.parsed into an object).
export const resolveReference = (value: any, resolvableVariables?: Record<string, any>): any => {
  if (!resolvableVariables) return undefined;
  if (typeof value !== 'string') return undefined;
  // Whole-string reference only — `{{a}}b` and partial refs fall through.
  // Surrounding whitespace inside the braces is tolerated (`{{ foo.bar }}`),
  // but a whitespace-containing identifier (`{{a b}}`) is not a valid name.
  const match = value.trim().match(/^\{\{\s*([^}\s]+)\s*\}\}$/);
  if (!match) return undefined;
  return getByPath(resolvableVariables, match[1]);
};

// string-form → typed JS value, or raw on failure. Pure coercion — no variable
// resolution. For reference resolution, call `resolveReference` first (see its
// docstring above for the recommended composition).
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
