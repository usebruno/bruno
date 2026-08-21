import { isEqual } from 'lodash';
import { uuid } from './common/index';
import { INVALID_VARIABLE_NAMES_ERROR_PREFIX } from './common/variables';

export const buildEnvVariable = ({ envVariable: obj, withUuid = false }) => {
  const isSecret = !!obj.secret;
  const envVariable = {
    name: obj.name ?? '',
    value: isSecret ? '' : (obj.value ?? ''),
    type: 'text',
    enabled: obj.enabled !== false,
    secret: isSecret
  };

  if (obj.dataType && obj.dataType !== 'string') {
    envVariable.dataType = obj.dataType;
  }

  if (obj.description !== undefined && obj.description !== '') {
    envVariable.description = obj.description;
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
 * Clears the duplicate a script write would otherwise leave behind, so a `bru.setEnvVar` is not
 * refused by the duplicate-secret save guard. Keeps the row the value landed on — the enabled one —
 * and drops its namesakes.
 */
const dropWrittenSecretNamesakes = (variables, writtenNames) => {
  if (!writtenNames.size) {
    return variables;
  }

  const survivors = new Map();
  variables.forEach((v) => {
    if (!v.secret || !writtenNames.has(v.name)) return;
    const current = survivors.get(v.name);
    if (!current || (!current.enabled && v.enabled)) survivors.set(v.name, v);
  });

  return variables.filter((v) => !v.secret || !writtenNames.has(v.name) || survivors.get(v.name) === v);
};

/**
 * Apply script-produced environment variables onto a variables array.
 *
 * With baseline: only applies values the script changed relative to the snapshot (preserves draft edits).
 * Without baseline: direct apply — overwrites all values from script output.
 * Disabled variables are preserved; script writes target the enabled slot only — if no
 * enabled var with `key` exists, a new enabled one is inserted (any same-named disabled var is left intact).
 * The one exception is a secret sharing a written name, which is dropped as a duplicate whether or
 * not it is enabled — see `dropWrittenSecretNamesakes`.
 *
 * Pure: does not mutate the input array or its entries. Returns a new array of new objects.
 */
export const applyScriptEnvVars = (variables, scriptVars, baseline, { skipKeys = [] } = {}) => {
  const scriptVarNames = new Set(Object.keys(scriptVars));
  const skip = new Set(skipKeys);
  const next = (variables || []).map((v) => ({ ...v }));
  const writtenNames = new Set();

  if (baseline) {
    Object.entries(scriptVars).forEach(([key, value]) => {
      if (skip.has(key)) return;
      const isNew = !(key in baseline);
      // Deep-equal so object/array typed vars whose structurally-equal value is re-written by the
      // script aren't treated as modifications (and thus don't clobber draft edits).
      const isModified = !isNew && !isEqual(baseline[key], value);

      if (isNew || isModified) {
        writtenNames.add(key);
        // Target only the enabled slot — a draft-disabled var with the same name must be preserved.
        const existing = next.find((v) => v.name === key && v.enabled);
        if (existing) {
          existing.value = value;
        } else {
          next.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
        }
      }
    });

    return dropWrittenSecretNamesakes(next.filter((v) => {
      if (!v.enabled) return true;
      if (v.name in baseline && !scriptVarNames.has(v.name)) return false;
      return true;
    }), writtenNames);
  }

  Object.entries(scriptVars).forEach(([key, value]) => {
    if (skip.has(key)) return;
    writtenNames.add(key);
    const existing = next.find((v) => v.name === key && v.enabled);
    if (existing) {
      existing.value = value;
    } else {
      next.push({ uid: uuid(), name: key, value, type: 'text', secret: false, enabled: true });
    }
  });

  return dropWrittenSecretNamesakes(next.filter((v) => !v.enabled || scriptVarNames.has(v.name)), writtenNames);
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

export const DUPLICATE_SECRET_NAMES_ERROR = 'Duplicate secret names are not allowed';
export const DUPLICATE_SECRET_NAME_FIELD_ERROR = 'Secret names must be unique';

/**
 * `saveEnvironment` / `saveGlobalEnvironment` reject either because the variables are unfit to save
 * or because the write itself failed. The former name what the user has to fix, so callers show
 * them verbatim; the latter keep the wording of the flow they came from.
 */
export const isEnvironmentValidationError = (err) =>
  err?.message === DUPLICATE_SECRET_NAMES_ERROR || !!err?.message?.startsWith(INVALID_VARIABLE_NAMES_ERROR_PREFIX);

/**
 * Secret values are persisted in a name-keyed side store and re-attached on read by name, so two
 * secrets sharing a name collapse to one and the second loses its value. Names must therefore be
 * unique among secrets. Returns the set of names carried by more than one secret variable. Only
 * secret rows are counted, so callers need not filter by tab.
 */
export const getDuplicateSecretNames = (variables) => {
  const counts = new Map();
  (variables || []).forEach((v) => {
    if (v.secret && v.name && v.name.trim() !== '') {
      const key = v.name.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
};

/**
 * Strips the duplicate secrets out of an imported environment, so an import never lands the user
 * with a collision they did not author. Keeps whichever twin holds a value, since a Postman export
 * ships secret values inline.
 */
export const dedupeImportedSecrets = (variables) => {
  const duplicates = getDuplicateSecretNames(variables);
  if (duplicates.size === 0) {
    return variables;
  }

  const survivors = new Map();
  variables.forEach((v) => {
    const name = (v.name || '').trim();
    if (!v.secret || !duplicates.has(name)) return;
    const current = survivors.get(name);
    if (!current || (!current.value && v.value)) survivors.set(name, v);
  });

  return variables.filter((v) => {
    const name = (v.name || '').trim();
    return !v.secret || !duplicates.has(name) || survivors.get(name) === v;
  });
};

/**
 * Strips the UID from an environment variable for comparison purposes.
 * This is useful when comparing variables where UIDs may differ but the actual data is the same.
 */
export const stripEnvVarUid = (variable) => {
  const { name, value, type, enabled, secret, description, dataType } = variable;
  const result = { name, value, type, enabled, secret };
  if (description !== undefined && description !== '') result.description = description;
  if (dataType && dataType !== 'string') {
    result.dataType = dataType;
  }
  return result;
};

/**
 * Whether a save must be refused for colliding secrets. Only a save that *changes* the secrets is
 * refused: a collision already on disk has long since cost the second secret its value, and
 * blocking on it would leave the user unable to save anything in that environment again.
 */
export const writesCollidingSecrets = (submittedVariables, savedVariables) => {
  if (getDuplicateSecretNames(submittedVariables).size === 0) {
    return false;
  }
  const secretsKey = (variables) => JSON.stringify((variables || []).filter((v) => v.secret).map(stripEnvVarUid));
  return secretsKey(submittedVariables) !== secretsKey(savedVariables);
};
