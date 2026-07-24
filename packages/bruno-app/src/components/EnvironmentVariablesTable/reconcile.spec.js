import { reconcileSavedChange } from './reconcile';

// Serialized snapshots stand in for the JSON the component compares. The
// concrete strings don't matter; only the equality relationships between
// prevSaved / nextSaved / current do.
const A = JSON.stringify([{ name: 'token', value: 'a' }]);
const AB = JSON.stringify([{ name: 'token', value: 'ab' }]);
const ABC = JSON.stringify([{ name: 'token', value: 'abc' }]);
const AX = JSON.stringify([{ name: 'token', value: 'ax' }]);

describe('reconcileSavedChange', () => {
  it('is a noop when the saved snapshot did not actually change', () => {
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: A, current: A })).toBe('noop');
    // even if the form has drifted, an unchanged save should never touch it
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: A, current: ABC })).toBe('noop');
  });

  it('is a noop when the form already matches the incoming snapshot (our own save landing)', () => {
    // user typed 'ab', autosave persisted 'ab', echo comes back == form
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: AB, current: AB })).toBe('noop');
  });

  it('adopts the incoming snapshot when the form is clean (external / file reload)', () => {
    // form still matches the old baseline => no unsaved edits => take new data
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: AB, current: A })).toBe('adopt');
  });

  it('adopts a script-written value when the user is not editing', () => {
    // request script called bru.setEnvVar; form was untouched
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: AX, current: A })).toBe('adopt');
  });

  it('skips (keeps edits) when the user typed ahead during an async save — the data-loss case', () => {
    // autosave persisted 'ab' but the user has since typed 'abc' into the form
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: AB, current: ABC })).toBe('skip');
  });

  it('skips a script env update while the user has unsaved edits', () => {
    // script rewrote the value to 'ax' but the user is mid-edit at 'abc'
    expect(reconcileSavedChange({ prevSaved: A, nextSaved: AX, current: ABC })).toBe('skip');
  });
});
