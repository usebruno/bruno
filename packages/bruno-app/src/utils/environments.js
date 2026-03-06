import { uuid } from './common/index';

/**
 * Whitelist of allowed environment variable properties based on schema.
 * Any properties not in this list will be stripped before validation/save.
 * Values are converted to strings to ensure compatibility with the file format.
 */
const sanitizeEnvVariable = (v) => {
  if (!v) return v;
  const { uid, name, value, type, enabled, secret } = v;

  // Convert non-string values to strings for file persistence
  // (scripts can set numbers, booleans, objects, etc. but the file format expects strings)
  // Also convert null/undefined to empty strings to match expected defaults
  let stringValue = '';
  if (value !== null && value !== undefined) {
    stringValue = typeof value === 'string' ? value : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  return {
    uid,
    name,
    value: stringValue,
    type,
    enabled,
    secret
  };
};

const isPersistableEnvVarForMerge = (persistedNames) => (v) => {
  return !v?.ephemeral || v?.persistedValue !== undefined || (v?.name && persistedNames.has(v.name));
};

const toPersistedEnvVarForMerge = (persistedNames) => (v) => {
  if (!v) return v;
  // Determine the value to use
  const valueToUse
    = v?.ephemeral && v?.persistedValue !== undefined && !(v?.name && persistedNames.has(v.name))
      ? v.persistedValue
      : v.value;
  // Return only whitelisted properties
  return sanitizeEnvVariable({ ...v, value: valueToUse });
};

const toPersistedEnvVarForSave = (v) => {
  if (!v) return v;

  const valueToUse = v.value;

  // Return only whitelisted properties with string conversion
  return sanitizeEnvVariable({ ...v, value: valueToUse });
};

/*
 High-level builder for persisted variables
 - mode 'save': write what the user sees
 - mode 'merge': write only allowed vars (non-ephemeral, ephemerals with persistedValue, or explicitly persisted this run)
*/
export const buildPersistedEnvVariables = (variables, { mode, persistedNames } = {}) => {
  const src = Array.isArray(variables) ? variables : [];
  if (mode === 'merge') {
    const names = persistedNames instanceof Set ? persistedNames : new Set();
    return src.filter(isPersistableEnvVarForMerge(names)).map(toPersistedEnvVarForMerge(names));
  }
  // default to save mode
  return src.map(toPersistedEnvVarForSave);
};

export const buildEnvVariable = ({ envVariable: obj, withUuid = false }) => {
  let envVariable = {
    name: obj.name ?? '',
    value: !!obj.secret ? '' : (obj.value ?? ''),
    type: 'text',
    enabled: obj.enabled !== false,
    secret: !!obj.secret
  };

  if (!withUuid) {
    return envVariable;
  }

  return {
    uid: uuid(),
    ...envVariable
  };
};

/**
 * Strips the UID from an environment variable for comparison purposes.
 * This is useful when comparing variables where UIDs may differ but the actual data is the same.
 */
export const stripEnvVarUid = (variable) => {
  const { name, value, type, enabled, secret } = variable;
  return { name, value, type, enabled, secret };
};
