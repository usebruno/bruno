/*
 Decide if an env var should be saved on disk.
 - keep non-ephemeral vars
 - keep ephemeral vars only if they have a persistedValue (explicitly persisted this run)
*/
export const isPersistableEnvVar = (v) => {
  return !v?.ephemeral || v?.persistedValue !== undefined;
};

/*
 Transform a UI/runtime var into the shape we write to disk.
 - strip ephemeral/persistedValue flags
 - for ephemerals with persistedValue, use that as the saved value
*/
export const toPersistedEnvVar = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return v?.ephemeral && persistedValue !== undefined ? { ...rest, value: persistedValue } : rest;
};

/*
 Merge filter: include
 - non-ephemeral vars
 - ephemerals with persistedValue
 - or names explicitly persisted this run (persistedNames)
*/
export const isPersistableEnvVarForMerge = (persistedNames) => (v) => {
  return !v?.ephemeral || v?.persistedValue !== undefined || (v?.name && persistedNames.has(v.name));
};

/*
 Merge transform:
 - for ephemerals not explicitly persisted this run, write their persistedValue
 - strip ephemeral/persistedValue flags in all cases
*/
export const toPersistedEnvVarForMerge = (persistedNames) => (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  if (v?.ephemeral && persistedValue !== undefined && !(v?.name && persistedNames.has(v.name))) {
    return { ...rest, value: persistedValue };
  }
  return rest;
};
