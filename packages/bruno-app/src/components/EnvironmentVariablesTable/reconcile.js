// Decide how the form reacts when the saved snapshot (environment.variables)
// changes: adopt it only when the form has no unsaved edits, otherwise keep the
// user's in-flight edits (the draft/autosave cycle persists them). Replaces
// Formik's enableReinitialize, which blindly reset and dropped keystrokes typed
// during a save. Args are the serialized (JSON, uid-stripped, named-rows-only)
// variable lists. Returns 'adopt' | 'skip' | 'noop'.
export const reconcileSavedChange = ({ prevSaved, nextSaved, current }) => {
  // The saved snapshot didn't actually change.
  if (prevSaved === nextSaved) return 'noop';

  // The form already matches the incoming snapshot (e.g. our own save landing).
  if (current === nextSaved) return 'noop';

  // The form still matches the previous baseline => the user has no unsaved
  // edits => it is safe to adopt the newly-saved / reloaded data.
  if (current === prevSaved) return 'adopt';

  // The form has diverged from both baselines => the user is editing ahead of
  // the save. Keep their edits and let the draft/autosave cycle catch up.
  return 'skip';
};
