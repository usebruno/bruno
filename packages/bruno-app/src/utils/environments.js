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

export const buildEnvVariable = (obj) => {
  return {
    name: obj.name ?? '',
    value: !!obj.secret ? '' : (obj.value ?? ''),
    type: 'text',
    enabled: obj.enabled !== false,
    secret: !!obj.secret
  };
};
