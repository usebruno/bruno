import { reconcileSavedChange, findExternallyAddedVariables } from './reconcile';

// Serialized snapshots stand in for the JSON the component compares. The
// concrete strings don't matter; only the equality relationships between
// prevSaved / nextSaved / current do.
const baselineValue = JSON.stringify([{ name: 'token', value: 'a' }]);
const autosavedValue = JSON.stringify([{ name: 'token', value: 'ab' }]);
const userEditedValue = JSON.stringify([{ name: 'token', value: 'abc' }]);
const scriptWrittenValue = JSON.stringify([{ name: 'token', value: 'ax' }]);

describe('reconcileSavedChange', () => {
  it('is a noop when the saved snapshot did not actually change', () => {
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: baselineValue, current: baselineValue })).toBe('noop');
    // even if the form has drifted, an unchanged save should never touch it
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: baselineValue, current: userEditedValue })).toBe('noop');
  });

  it('is a noop when the form already matches the incoming snapshot (our own save landing)', () => {
    // user typed 'ab', autosave persisted 'ab', echo comes back == form
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: autosavedValue, current: autosavedValue })).toBe('noop');
  });

  it('adopts the incoming snapshot when the form is clean (external / file reload)', () => {
    // form still matches the old baseline => no unsaved edits => take new data
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: autosavedValue, current: baselineValue })).toBe('adopt');
  });

  it('adopts a script-written value when the user is not editing', () => {
    // request script called bru.setEnvVar; form was untouched
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: scriptWrittenValue, current: baselineValue })).toBe('adopt');
  });

  it('skips (keeps edits) when the user typed ahead during an async save — the data-loss case', () => {
    // autosave persisted 'ab' but the user has since typed 'abc' into the form
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: autosavedValue, current: userEditedValue })).toBe('skip');
  });

  it('skips a script env update while the user has unsaved edits', () => {
    // script rewrote the value to 'ax' but the user is mid-edit at 'abc'
    expect(reconcileSavedChange({ prevSaved: baselineValue, nextSaved: scriptWrittenValue, current: userEditedValue })).toBe('skip');
  });
});

describe('findExternallyAddedVariables', () => {
  it('finds a variable added purely externally, absent from both baselines', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [{ uid: 'u1', name: 'token' }],
      nextRawSaved: [{ uid: 'u1', name: 'token' }, { uid: 'u2', name: 'newVar' }],
      currentValues: [{ uid: 'u1', name: 'token' }, { uid: 'draft', name: '' }]
    });

    expect(added).toEqual([{ uid: 'u2', name: 'newVar' }]);
  });

  it('excludes a name that already existed in the previous saved snapshot (a modification, not an addition)', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [{ uid: 'u1', name: 'token' }],
      nextRawSaved: [{ uid: 'u1-new', name: 'token' }],
      currentValues: [{ uid: 'u1', name: 'token' }]
    });

    expect(added).toEqual([]);
  });

  it('excludes a name that collides with something the user is currently editing', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [],
      nextRawSaved: [{ uid: 'u2', name: 'newVar' }],
      currentValues: [{ uid: 'u1', name: 'newVar' }, { uid: 'draft', name: '' }]
    });

    expect(added).toEqual([]);
  });

  it('ignores the trailing empty "add new" row when checking for name collisions', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [],
      nextRawSaved: [{ uid: 'u2', name: 'newVar' }],
      currentValues: [{ uid: 'draft', name: '' }]
    });

    expect(added).toEqual([{ uid: 'u2', name: 'newVar' }]);
  });

  it('returns an empty array when there is nothing additive', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [{ uid: 'u1', name: 'token' }],
      nextRawSaved: [{ uid: 'u1', name: 'token' }],
      currentValues: [{ uid: 'u1', name: 'token' }]
    });

    expect(added).toEqual([]);
  });

  it('handles missing arguments gracefully', () => {
    expect(findExternallyAddedVariables({})).toEqual([]);
  });

  it('excludes a same-uid row even when its name differs — the fast-typing/autosave-echo race', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [],
      nextRawSaved: [{ uid: 'u1', name: 'hellll' }],
      currentValues: [{ uid: 'u1', name: 'hellllllloooooo' }, { uid: 'draft', name: '' }]
    });

    expect(added).toEqual([]);
  });

  it('detects a new enabled row added externally even though a disabled row of the same name already existed', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [{ uid: 'u1', name: 'token', enabled: false }],
      nextRawSaved: [
        { uid: 'u1', name: 'token', enabled: false },
        { uid: 'u2', name: 'token', enabled: true }
      ],
      currentValues: [{ uid: 'u1', name: 'token', enabled: false }, { uid: 'draft', name: '' }]
    });

    expect(added).toEqual([{ uid: 'u2', name: 'token', enabled: true }]);
  });

  it('detects a new enabled secret added externally even though an enabled plain variable of the same name already existed', () => {
    const added = findExternallyAddedVariables({
      prevRawSaved: [{ uid: 'u1', name: 'token', enabled: true, secret: false }],
      nextRawSaved: [
        { uid: 'u1', name: 'token', enabled: true, secret: false },
        { uid: 'u2', name: 'token', enabled: true, secret: true }
      ],
      currentValues: [{ uid: 'u1', name: 'token', enabled: true, secret: false }, { uid: 'draft', name: '' }]
    });

    expect(added).toEqual([{ uid: 'u2', name: 'token', enabled: true, secret: true }]);
  });
});
