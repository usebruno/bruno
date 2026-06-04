import { uuid } from './common/index';

const stripEphemeralMetadata = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return rest;
};

/*
 Build variables suitable for persisting to disk.
 Strips internal metadata (ephemeral, persistedValue) that should not be written to the environment file.
*/
export const buildPersistedEnvVariables = (variables) => {
  const src = Array.isArray(variables) ? variables : [];
  return src.map(stripEphemeralMetadata);
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
 * Apply script-produced environment variables onto a variables array.
 *
 * Two modes:
 *  - **Baseline diff** (baseline provided): only apply values the script actually
 *    changed relative to the baseline snapshot. This preserves user draft edits
 *    for variables the script didn't touch.
 *  - **Direct apply** (no baseline): overwrite all values from the script output.
 *
 * In both modes, disabled variables are always preserved and new variables from
 * the script are added.
 *
 * @param {Array}  variables       The current variable array (mutated in place for the reducer path,
 *                                 or cloned beforehand for the thunk path).
 * @param {Object} scriptVars      Flat {name: value} map returned by the script runtime.
 * @param {Object} [baseline]      Flat {name: value} snapshot of the saved state at the time the
 *                                 draft was flushed. Pass null/undefined for direct-apply mode.
 * @param {Object} [opts]          Options.
 * @param {Array}  [opts.skipKeys] Keys to ignore in scriptVars (e.g. ['__name__']).
 * @returns {Array} The filtered variables array (same reference when possible).
 */
export const applyScriptEnvVars = (variables, scriptVars, baseline, { skipKeys = [] } = {}) => {
  const scriptVarNames = new Set(Object.keys(scriptVars));
  const skip = new Set(skipKeys);

  if (baseline) {
    // Diff mode: only apply what the script actually changed
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

    // Remove only vars the script explicitly deleted (existed in baseline but absent from script output)
    return variables.filter((v) => {
      if (!v.enabled) return true;
      if (v.name in baseline && !scriptVarNames.has(v.name)) return false;
      return true;
    });
  }

  // Direct apply: the script runtime returns the FULL env vars map (not just modified vars),
  // so any enabled variable absent from scriptVars was explicitly deleted by the script.
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
  const { name, value, type, enabled, secret } = variable;
  return { name, value, type, enabled, secret };
};
