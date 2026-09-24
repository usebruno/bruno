const { applyCollectionVarsToCollectionRoot } = require('./apply-collection-vars');

describe('applyCollectionVarsToCollectionRoot', () => {
  const makeCollection = (req = []) => ({
    root: { request: { vars: { req } } }
  });

  test('no-op when collectionVariables is null/undefined/non-object', () => {
    const before = [{ uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true }];
    const collection = makeCollection([...before]);

    applyCollectionVarsToCollectionRoot(collection, null);
    expect(collection.root.request.vars.req).toEqual(before);

    applyCollectionVarsToCollectionRoot(collection, undefined);
    expect(collection.root.request.vars.req).toEqual(before);

    applyCollectionVarsToCollectionRoot(collection, 'not-an-object');
    expect(collection.root.request.vars.req).toEqual(before);
  });

  test('updates value on existing enabled var (preserves uid/type/enabled flag)', () => {
    const collection = makeCollection([
      { uid: 'u1', name: 'counter', value: '0', type: 'text', enabled: true }
    ]);

    applyCollectionVarsToCollectionRoot(collection, { counter: '1' });

    expect(collection.root.request.vars.req).toEqual([
      { uid: 'u1', name: 'counter', value: '1', type: 'text', enabled: true }
    ]);
  });

  test('adds a new enabled var with generated uid for keys the script introduces', () => {
    const collection = makeCollection([]);

    applyCollectionVarsToCollectionRoot(collection, { fresh: 'value' });

    const req = collection.root.request.vars.req;
    expect(req).toHaveLength(1);
    expect(req[0].name).toBe('fresh');
    expect(req[0].value).toBe('value');
    expect(req[0].type).toBe('text');
    expect(req[0].enabled).toBe(true);
    expect(typeof req[0].uid).toBe('string');
    expect(req[0].uid.length).toBeGreaterThan(0);
  });

  test('drops previously-enabled vars missing from the script output (delete semantics)', () => {
    const collection = makeCollection([
      { uid: 'u1', name: 'keep', value: '1', type: 'text', enabled: true },
      { uid: 'u2', name: 'drop', value: '1', type: 'text', enabled: true }
    ]);

    applyCollectionVarsToCollectionRoot(collection, { keep: '2' });

    expect(collection.root.request.vars.req).toEqual([
      { uid: 'u1', name: 'keep', value: '2', type: 'text', enabled: true }
    ]);
  });

  test('disabled vars are preserved untouched and not subject to delete semantics', () => {
    const collection = makeCollection([
      { uid: 'u1', name: 'enabledKey', value: '1', type: 'text', enabled: true },
      { uid: 'u2', name: 'disabledKey', value: 'kept', type: 'text', enabled: false }
    ]);

    // Script doesn't touch disabledKey or enabledKey; only writes a new one.
    applyCollectionVarsToCollectionRoot(collection, { newKey: 'newVal' });

    const req = collection.root.request.vars.req;
    expect(req).toContainEqual({ uid: 'u2', name: 'disabledKey', value: 'kept', type: 'text', enabled: false });
    expect(req.find((v) => v.name === 'newKey')).toMatchObject({ value: 'newVal', enabled: true });
    expect(req.find((v) => v.name === 'enabledKey')).toBeUndefined();
  });

  test('mirrors writes onto collection.draft.root when a draft exists', () => {
    const collection = {
      root: { request: { vars: { req: [{ uid: 'u1', name: 'a', value: '0', type: 'text', enabled: true }] } } },
      draft: {
        root: { request: { vars: { req: [{ uid: 'u1', name: 'a', value: '0', type: 'text', enabled: true }] } } }
      }
    };

    applyCollectionVarsToCollectionRoot(collection, { a: 'updated' });

    expect(collection.root.request.vars.req[0].value).toBe('updated');
    expect(collection.draft.root.request.vars.req[0].value).toBe('updated');
  });

  test('does not crash when collection.draft is absent', () => {
    const collection = makeCollection([{ uid: 'u1', name: 'a', value: '0', type: 'text', enabled: true }]);
    expect(() => applyCollectionVarsToCollectionRoot(collection, { a: '1' })).not.toThrow();
  });

  test('initializes root.request.vars.req when collection.root.request.vars is missing', () => {
    const collection = { root: {} };
    applyCollectionVarsToCollectionRoot(collection, { a: '1' });

    expect(collection.root.request.vars.req).toHaveLength(1);
    expect(collection.root.request.vars.req[0]).toMatchObject({ name: 'a', value: '1', enabled: true });
  });

  test('empty collectionVariables clears all previously-enabled vars (delete-by-omission)', () => {
    // The function treats `result.collectionVariables` as a full snapshot of the
    // script's view of enabled vars — so an empty object means "delete every
    // enabled var." This is correct ONLY if the bruno-js runtime always emits
    // the full enabled snapshot (not a delta). If the runtime ever changes to
    // emit `{}` when a script doesn't touch collection vars, this lock-in test
    // will start surfacing data loss in folder runs. Disabled vars are still
    // preserved either way.
    const collection = makeCollection([
      { uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true },
      { uid: 'u2', name: 'b', value: '2', type: 'text', enabled: true },
      { uid: 'u3', name: 'c', value: '3', type: 'text', enabled: false }
    ]);

    applyCollectionVarsToCollectionRoot(collection, {});

    expect(collection.root.request.vars.req).toEqual([
      { uid: 'u3', name: 'c', value: '3', type: 'text', enabled: false }
    ]);
  });

  test('normalizes a non-array root.request.vars.req without crashing', () => {
    const collection = { root: { request: { vars: { req: 'oops-not-an-array' } } } };

    expect(() => applyCollectionVarsToCollectionRoot(collection, { a: '1' })).not.toThrow();

    const req = collection.root.request.vars.req;
    expect(Array.isArray(req)).toBe(true);
    expect(req).toHaveLength(1);
    expect(req[0]).toMatchObject({ name: 'a', value: '1', enabled: true });
  });

  test('silently no-ops when collection.root is absent', () => {
    const collection = {};
    expect(() => applyCollectionVarsToCollectionRoot(collection, { a: '1' })).not.toThrow();
    expect(collection.root).toBeUndefined();
  });

  test('current behavior: when a script writes a name that also exists as disabled, both entries are present', () => {
    // Documents the duplicate-name edge case surfaced in PR review. The script
    // sees only the enabled namespace, so it can't "see" a disabled var of the
    // same name — but the rebuild here doesn't dedupe by name across the two
    // slices. If this becomes a real problem, the fix is to filter `disabled`
    // by `!scriptNames.includes(v.name)` before concatenation. Until then,
    // lock the behavior so a future change is explicit.
    const collection = makeCollection([
      { uid: 'u-disabled', name: 'shared', value: 'old-disabled', type: 'text', enabled: false }
    ]);

    applyCollectionVarsToCollectionRoot(collection, { shared: 'from-script' });

    const req = collection.root.request.vars.req;
    expect(req).toHaveLength(2);
    expect(req).toContainEqual(expect.objectContaining({ name: 'shared', value: 'from-script', enabled: true }));
    expect(req).toContainEqual({ uid: 'u-disabled', name: 'shared', value: 'old-disabled', type: 'text', enabled: false });
  });
});
