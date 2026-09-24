// Decide how the form reacts when the saved snapshot (environment.variables)
// changes: adopt it only when the form has no unsaved edits, otherwise keep the
// user's in-flight edits (the draft/autosave cycle persists them). Replaces
// Formik's enableReinitialize, which blindly reset and dropped keystrokes typed
// during a save. Args are the serialized (JSON, uid-stripped, named-rows-only)
// variable lists. Returns 'adopt' | 'skip' | 'noop'.
export const reconcileSavedChange = ({ prevSaved, nextSaved, current }) => {
  // The saved snapshot didn't actually change.
  if (prevSaved === nextSaved || current === nextSaved) return 'noop';

  // The form still matches the previous baseline => the user has no unsaved
  // edits => it is safe to adopt the newly-saved / reloaded data.
  if (current === prevSaved) return 'adopt';

  // The form has diverged from both baselines => the user is editing ahead of
  // the save. Keep their edits and let the draft/autosave cycle catch up.
  return 'skip';
};

const isSameRow = (a, b) => a.name === b.name && !!a.enabled === !!b.enabled && !!a.secret === !!b.secret;

/*
  when reconcileSavedChange returns 'skip', there might be changes added externally via
  the variable tooltip. Merge that back if form is dirty.
  prevRawSaved (what the environment looked like last time this component checked),
  nextRawSaved (what it looks like now, per the latest Redux state)
  currentValues (what's currently sitting in the Formik form, i.e. the user's in-progress edits).
 */

export const findExternallyAddedVariables = ({
  prevRawSaved = [],
  nextRawSaved = [],
  currentValues = []
}) => {
  const currentVariableUids = new Set(
    currentValues.map((variable) => variable.uid).filter(Boolean)
  );

  // Already known as of the last saved snapshot, not a new addition.
  const wasPreviouslySaved = (variable) =>
    prevRawSaved.some((savedVariable) => isSameRow(savedVariable, variable));

  // The user is already handling a row with this (name, enabled) in the form.
  const alreadyExistsInCurrentValues = (variable) =>
    currentValues.some((currentVariable) => isSameRow(currentVariable, variable));

  // Same underlying row as one in the form (renamed externally and/or locally), not a separate addition.
  const alreadyExistsByUid = (variable) =>
    currentVariableUids.has(variable.uid);

  return nextRawSaved.filter((variable) => {
    if (!variable.name) return false;

    if (wasPreviouslySaved(variable)) return false;
    if (alreadyExistsInCurrentValues(variable)) return false;
    if (alreadyExistsByUid(variable)) return false;

    return true;
  });
};
