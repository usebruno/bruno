import { isEqual } from 'lodash';
import { uuid } from './common/index';

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
 * Disabled variables are always preserved; script writes target the enabled slot only — if no
 * enabled var with `key` exists, a new enabled one is inserted (any same-named disabled var is left intact).
 *
 * Pure: does not mutate the input array or its entries. Returns a new array of new objects.
 */
export const applyScriptEnvVars = (variables, scriptVars, baseline, { skipKeys = [] } = {}) => {
  const scriptVarNames = new Set(Object.keys(scriptVars));
  const skip = new Set(skipKeys);
  const next = (variables || []).map((v) => ({ ...v }));

  if (baseline) {
    Object.entries(scriptVars).forEach(([key, value]) => {
      if (skip.has(key)) return;
      const isNew = !(key in baseline);
      // Deep-equal so object/array typed vars whose structurally-equal value is re-written by the
      // script aren't treated as modifications (and thus don't clobber draft edits).
      const isModified = !isNew && !isEqual(baseline[key], value);

      if (isNew || isModified) {
        // Target only the enabled slot — a draft-disabled var with the same name must be preserved.
        const existing = next.find((v) => v.name === key && v.enabled);
        if (existing) {
          existing.value = value;
        } else {
          next.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
        }
      }
    });

    return next.filter((v) => {
      if (!v.enabled) return true;
      if (v.name in baseline && !scriptVarNames.has(v.name)) return false;
      return true;
    });
  }

  Object.entries(scriptVars).forEach(([key, value]) => {
    if (skip.has(key)) return;
    const existing = next.find((v) => v.name === key && v.enabled);
    if (existing) {
      existing.value = value;
    } else {
      next.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
    }
  });

  return next.filter((v) => !v.enabled || scriptVarNames.has(v.name));
};

/**
 * Returns the set of keys the script actually modified relative to a baseline (or all script keys
 * when no baseline is supplied — direct-apply mode). Used by the slice reducers to scope dataType
 * re-inference to vars that actually changed; without this the dataType loop would clobber a user's
 * draft-only typed value edit on every no-op script re-run.
 */
export const getScriptModifiedKeys = (scriptVars, baseline, { skipKeys = [] } = {}) => {
  const skip = new Set(skipKeys);
  const out = new Set();
  Object.entries(scriptVars || {}).forEach(([key, value]) => {
    if (skip.has(key)) return;
    if (baseline) {
      const isNew = !(key in baseline);
      if (!isNew && isEqual(baseline[key], value)) return;
    }
    out.add(key);
  });
  return out;
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
