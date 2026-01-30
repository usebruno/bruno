import { uuid } from './common/index';

const isPersistableEnvVarForMerge = (persistedNames) => (v) => {
  return !v?.ephemeral || v?.persistedValue !== undefined || (v?.name && persistedNames.has(v.name));
};

const toPersistedEnvVarForMerge = (persistedNames) => (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  if (v?.ephemeral && persistedValue !== undefined && !(v?.name && persistedNames.has(v.name))) {
    return { ...rest, value: persistedValue };
  }
  return rest;
};

const isPersistableEnvVarForSave = (v) => {
  if (!v) return false;
  return !v.ephemeral || v.persistedValue !== undefined;
};

const toPersistedEnvVarForSave = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return v?.ephemeral ? (persistedValue !== undefined ? { ...rest, value: persistedValue } : rest) : rest;
};

// mode 'save': filters out ephemeral vars without persistedValue (script-created, never on disk)
// mode 'merge': same as 'save', but also includes ephemeral vars explicitly persisted this run
export const buildPersistedEnvVariables = (variables, { mode, persistedNames } = {}) => {
  const src = Array.isArray(variables) ? variables : [];
  if (mode === 'merge') {
    const names = persistedNames instanceof Set ? persistedNames : new Set();
    return src
      .filter(isPersistableEnvVarForMerge(names))
      .map(toPersistedEnvVarForMerge(names));
  }

  // default to save mode
  return src
    .filter(isPersistableEnvVarForSave)
    .map(toPersistedEnvVarForSave);
};

/**
 * Merge new persistent vars (from script) with existing vars (from file)
 * - If var exists in both: update value, preserve metadata (uid, secret, enabled)
 * - If var only in file: keep unchanged
 * - If var only in script: add as new
 */
export const mergeEnvVariables = (existingVars, newPersistentVars) => {
  const normalized = Object.entries(newPersistentVars || {}).map(([name, value]) => ({
    uid: uuid(),
    name,
    value,
    type: 'text',
    enabled: true,
    secret: false
  }));

  // Update existing vars with new values, preserving metadata (uid, secret, enabled)
  const merged = (existingVars || []).map((v) => {
    const found = normalized.find((nv) => nv.name === v.name);
    return found ? { ...v, value: found.value } : v;
  });

  // Add new vars that don't exist in the file yet
  normalized.forEach((nv) => {
    if (!merged.some((v) => v.name === nv.name)) {
      merged.push(nv);
    }
  });

  return merged;
};

/**
 * Build set of variable names that should be persisted
 */
export const buildPersistedNames = (persistentEnvVariables, existingVars, envVariables) => {
  const persistedNames = new Set(Object.keys(persistentEnvVariables || {}));
  const currentVarNames = new Set(Object.keys(envVariables || {}));

  (existingVars || []).forEach((v) => {
    if (!v.ephemeral && currentVarNames.has(v.name)) {
      persistedNames.add(v.name);
    }
  });

  return persistedNames;
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
