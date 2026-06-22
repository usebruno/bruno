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

const toPersistedEnvVarForSave = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return rest;
};

// mode 'save': commit the visible value (Save button).
// mode 'merge': commit only allowed vars — non-ephemeral, ephemerals with
//   persistedValue, or names explicitly persisted this run.
export const buildPersistedEnvVariables = (variables, { mode, persistedNames } = {}) => {
  const src = Array.isArray(variables) ? variables : [];
  if (mode === 'merge') {
    const names = persistedNames instanceof Set ? persistedNames : new Set();
    return src.filter(isPersistableEnvVarForMerge(names)).map(toPersistedEnvVarForMerge(names));
  }
  return src.map(toPersistedEnvVarForSave);
};

export const buildEnvVariable = ({ envVariable: obj, withUuid = false }) => {
  const isSecret = !!obj.secret;
  let envVariable = {
    name: obj.name ?? '',
    value: isSecret ? '' : (obj.value ?? ''),
    type: 'text',
    enabled: obj.enabled !== false,
    secret: isSecret
  };

  if (obj.dataType && obj.dataType !== 'string') {
    envVariable.dataType = obj.dataType;
  }

  if (!withUuid) {
    return envVariable;
  }

  return {
    uid: uuid(),
    ...envVariable
  };
};

export const stripEnvVarUid = (variable) => {
  const { name, value, type, enabled, secret, dataType } = variable;
  const result = { name, value, type, enabled, secret };
  if (dataType && dataType !== 'string') {
    result.dataType = dataType;
  }
  return result;
};
