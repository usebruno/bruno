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

/*
  when reconcileSavedChange returns 'skip', find the subset of `nextRawSaved` that were
  added elsewhere (e.g. via the undefined-variable tooltip's "Add to" switcher) while the form was dirty,
  and merge them back in.
 */
export const findExternallyAddedVariables = ({ prevRawSaved, nextRawSaved, currentValues }) => {
  const prevNames = new Set((prevRawSaved || []).map((v) => v.name));
  const currentNames = new Set((currentValues || []).map((v) => v.name).filter(Boolean));
  const currentUids = new Set((currentValues || []).map((v) => v.uid).filter(Boolean));

  return (nextRawSaved || []).filter(
    (v) => v.name && !prevNames.has(v.name) && !currentNames.has(v.name) && !currentUids.has(v.uid)
  );
};
