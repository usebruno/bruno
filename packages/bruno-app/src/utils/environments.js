import { uuid } from './common/index';

const isPersistableEnvVarForMerge = (persistedNames) => (v) => {
  // Keep variable if:
  // 1. It's ephemeral with persistedValue (was modified by script, restore original)
  // 2. It's in persistedNames (explicitly persisted this run or non-ephemeral that wasn't deleted)
  // 3. It's non-ephemeral AND in persistedNames (exclude deleted non-ephemeral variables)
  if (v?.ephemeral) {
    return v?.persistedValue !== undefined || (v?.name && persistedNames.has(v.name));
  }
  // Non-ephemeral variables: only keep if in persistedNames (not deleted)
  return v?.name && persistedNames.has(v.name);
};

const toPersistedEnvVarForMerge = (persistedNames) => (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  if (v?.ephemeral && persistedValue !== undefined && !(v?.name && persistedNames.has(v.name))) {
    return { ...rest, value: persistedValue };
  }
  return rest;
};

const toPersistedEnvVarForSave = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return v?.ephemeral ? (persistedValue !== undefined ? { ...rest, value: persistedValue } : rest) : rest;
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
