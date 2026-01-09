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
