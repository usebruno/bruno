import { uuid } from './common/index';

const isPersistableEnvVarForMerge = (persistedNames) => (v) => {
  if (!v?.ephemeral) {
    return true;
  }
  if (v?.persistedValue !== undefined) {
    return true;
  }
  if (v?.name && persistedNames.has(v.name)) {
    return true;
  }
  return false;
};

const toPersistedEnvVarForMerge = (persistedNames) => (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};

  if (v?.ephemeral && persistedValue !== undefined && !(v?.name && persistedNames.has(v.name))) {
    return { ...rest, value: persistedValue };
  }

  return rest;
};

const isPersistableEnvVarForSave = (v) => {
  if (!v?.ephemeral) {
    return true;
  }
  if (v?.persistedValue !== undefined) {
    return true;
  }
  return false;
};

const toPersistedEnvVarForSave = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};

  if (v?.ephemeral && persistedValue !== undefined) {
    return { ...rest, value: persistedValue };
  }

  return rest;
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
