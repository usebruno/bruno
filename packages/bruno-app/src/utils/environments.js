import { uuid } from './common/index';

const stripEphemeralMetadata = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return rest;
};

/*
 Strips internal metadata that should not be written to the environment file.
*/
export const buildPersistedEnvVariables = (variables) => {
  const src = Array.isArray(variables) ? variables : [];
  return src.map(stripEphemeralMetadata);
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

/**
 * Apply script-produced environment variables onto a variables array.
 *
 * With baseline: only applies values the script changed relative to the snapshot (preserves draft edits).
 * Without baseline: direct apply — overwrites all values from script output.
 * Disabled variables are always preserved.
 */
export const applyScriptEnvVars = (variables, scriptVars, baseline, { skipKeys = [] } = {}) => {
  const scriptVarNames = new Set(Object.keys(scriptVars));
  const skip = new Set(skipKeys);

  if (baseline) {
    Object.entries(scriptVars).forEach(([key, value]) => {
      if (skip.has(key)) return;
      const isNew = !(key in baseline);
      const isModified = !isNew && baseline[key] !== value;

      if (isNew || isModified) {
        const existing = variables.find((v) => v.name === key);
        if (existing) {
          existing.value = value;
        } else {
          variables.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
        }
      }
    });

    return variables.filter((v) => {
      if (!v.enabled) return true;
      if (v.name in baseline && !scriptVarNames.has(v.name)) return false;
      return true;
    });
  }

  Object.entries(scriptVars).forEach(([key, value]) => {
    if (skip.has(key)) return;
    const existing = variables.find((v) => v.name === key);
    if (existing) {
      existing.value = value;
    } else {
      variables.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
    }
  });

  return variables.filter((v) => !v.enabled || scriptVarNames.has(v.name));
};

/**
 * Strips the UID from an environment variable for comparison purposes.
 * This is useful when comparing variables where UIDs may differ but the actual data is the same.
 */
export const stripEnvVarUid = (variable) => {
  const { name, value, type, enabled, secret, dataType } = variable;
  const result = { name, value, type, enabled, secret };
  if (dataType && dataType !== 'string') {
    result.dataType = dataType;
  }
  return result;
};
