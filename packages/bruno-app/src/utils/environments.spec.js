jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { applyScriptEnvVars, buildEnvVariable, stripEnvVarUid } from './environments';

describe('buildEnvVariable — dataType preservation for env export/import', () => {
  it('preserves non-string datatypes on non-secret variables', () => {
    expect(buildEnvVariable({ envVariable: { name: 'count', value: 42, secret: false, dataType: 'number' } }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' });

    expect(buildEnvVariable({ envVariable: { name: 'flag', value: true, secret: false, dataType: 'boolean' } }))
      .toEqual({ name: 'flag', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' });

    expect(buildEnvVariable({ envVariable: { name: 'cfg', value: { k: 1 }, secret: false, dataType: 'object' } }))
      .toEqual({ name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, dataType: 'object' });
  });

  it('drops `dataType: \'string\'` (the implicit default)', () => {
    const out = buildEnvVariable({ envVariable: { name: 'greeting', value: 'hi', secret: false, dataType: 'string' } });
    expect(out).toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
    expect(out.dataType).toBeUndefined();
  });

  it('keeps dataType on secret variables but clears their value', () => {
    const out = buildEnvVariable({ envVariable: { name: 'token', value: 'shh', secret: true, dataType: 'number' } });
    expect(out).toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' });
  });

  it('attaches a uid when withUuid is true', () => {
    const out = buildEnvVariable({
      envVariable: { name: 'count', value: 42, secret: false, dataType: 'number' },
      withUuid: true
    });
    expect(out.uid).toEqual(expect.any(String));
    expect(out).toMatchObject({ name: 'count', value: 42, dataType: 'number' });
  });
});

describe('stripEnvVarUid — datatype-aware comparison key', () => {
  it('keeps non-string datatypes', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' }))
      .toEqual({ name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' });
  });

  it('drops `dataType: \'string\'`', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, dataType: 'string' }))
      .toEqual({ name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false });
  });

  it('keeps dataType on secrets', () => {
    expect(stripEnvVarUid({ uid: 'u', name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' }))
      .toEqual({ name: 'token', value: '', type: 'text', enabled: true, secret: true, dataType: 'number' });
  });
});

describe('applyScriptEnvVars', () => {
  const v = (name, value, enabled = true) => ({
    uid: `uid-${name}`,
    name,
    value,
    type: 'text',
    secret: false,
    enabled
  });

  describe('direct-apply mode (no baseline)', () => {
    it('updates the value of an existing variable', () => {
      const result = applyScriptEnvVars([v('host', 'old')], { host: 'new' }, null);
      expect(result.find((x) => x.name === 'host').value).toBe('new');
    });

    it('appends variables present in scriptVars but not in the array', () => {
      const result = applyScriptEnvVars([v('host', 'h')], { host: 'h', token: 'abc' }, null);
      expect(result).toHaveLength(2);
      expect(result.find((x) => x.name === 'token')).toMatchObject({
        name: 'token',
        value: 'abc',
        type: 'text',
        secret: false,
        enabled: true
      });
    });

    it('removes enabled variables missing from scriptVars (script deleted them)', () => {
      const result = applyScriptEnvVars([v('host', 'h'), v('stale', 'remove-me')], { host: 'h' }, null);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('host');
    });

    it('preserves disabled variables even if missing from scriptVars', () => {
      const result = applyScriptEnvVars([v('host', 'h'), v('keep', 'k', false)], { host: 'h' }, null);
      expect(result.map((x) => x.name).sort()).toEqual(['host', 'keep']);
    });

    it('honors skipKeys — entries are neither applied nor used for the removal filter', () => {
      const result = applyScriptEnvVars(
        [v('host', 'h')],
        { host: 'h', __name__: 'Test' },
        null,
        { skipKeys: ['__name__'] }
      );
      // __name__ is not pushed as a new var even though it appeared in scriptVars
      expect(result.find((x) => x.name === '__name__')).toBeUndefined();
      // host is still present (it IS in scriptVarNames, which is built before skipKeys is applied)
      expect(result.find((x) => x.name === 'host')).toBeDefined();
    });

    it('preserves typed (non-string) values without coercion', () => {
      const result = applyScriptEnvVars([], { count: 42, flag: true, cfg: { k: 1 } }, null);
      expect(result.find((x) => x.name === 'count').value).toBe(42);
      expect(result.find((x) => x.name === 'flag').value).toBe(true);
      expect(result.find((x) => x.name === 'cfg').value).toEqual({ k: 1 });
    });

    it('returns an empty array when both inputs are empty', () => {
      expect(applyScriptEnvVars([], {}, null)).toEqual([]);
    });

    it('preserves dataType on an existing var when only its value is updated', () => {
      const existing = [{ ...v('count', 41), dataType: 'number' }];
      const result = applyScriptEnvVars(existing, { count: 42 }, null);
      const out = result.find((x) => x.name === 'count');
      expect(out.value).toBe(42);
      expect(out.dataType).toBe('number');
    });

    it('does NOT attach a dataType to newly-pushed vars — that is the caller\'s responsibility', () => {
      // applyScriptEnvVars never calls getDataTypeFromValue; the slice that owns the
      // dispatch (scriptEnvironmentUpdateEvent / globalEnvironmentsUpdateEvent /
      // collectionVariablesUpdateEvent) infers and attaches dataType after this merge.
      const result = applyScriptEnvVars([], { count: 42, flag: true, cfg: { k: 1 } }, null);
      expect(result.find((x) => x.name === 'count').dataType).toBeUndefined();
      expect(result.find((x) => x.name === 'flag').dataType).toBeUndefined();
      expect(result.find((x) => x.name === 'cfg').dataType).toBeUndefined();
    });
  });

  describe('baseline-diff mode (preserves draft edits)', () => {
    it('does NOT overwrite a draft edit when the script value matches the baseline (unchanged)', () => {
      const draftVars = [v('host', 'draft-edit')];
      const baseline = { host: 'saved-value' };
      const scriptVars = { host: 'saved-value' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      expect(result.find((x) => x.name === 'host').value).toBe('draft-edit');
    });

    it('overwrites the draft value when the script value differs from baseline (modified)', () => {
      const draftVars = [v('host', 'draft-edit')];
      const baseline = { host: 'saved-value' };
      const scriptVars = { host: 'script-new-value' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      expect(result.find((x) => x.name === 'host').value).toBe('script-new-value');
    });

    it('adds variables that appear in scriptVars but not in baseline (new)', () => {
      const draftVars = [v('host', 'h')];
      const baseline = { host: 'h' };
      const scriptVars = { host: 'h', fresh: 'from-script' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      expect(result.find((x) => x.name === 'fresh')).toMatchObject({
        name: 'fresh',
        value: 'from-script',
        enabled: true
      });
    });

    it('removes variables that were in baseline but missing from scriptVars (script deleted)', () => {
      const draftVars = [v('host', 'h'), v('wasSaved', 'value')];
      const baseline = { host: 'h', wasSaved: 'value' };
      const scriptVars = { host: 'h' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      expect(result.find((x) => x.name === 'wasSaved')).toBeUndefined();
    });

    it('preserves draft-only variables (not in baseline, not in scriptVars)', () => {
      const draftVars = [v('host', 'h'), v('draft-only', 'user-added')];
      const baseline = { host: 'h' };
      const scriptVars = { host: 'h' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      expect(result.find((x) => x.name === 'draft-only')).toMatchObject({
        name: 'draft-only',
        value: 'user-added'
      });
    });

    it('preserves disabled variables even when they would otherwise be removed', () => {
      const draftVars = [v('host', 'h'), v('disabled', 'keep', false)];
      const baseline = { host: 'h', disabled: 'keep' };
      const scriptVars = { host: 'h' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      // 'disabled' is in baseline and missing from scriptVars, but it's disabled so it stays
      expect(result.find((x) => x.name === 'disabled')).toMatchObject({ name: 'disabled', enabled: false });
    });

    it('honors skipKeys — does not modify or add skipped entries', () => {
      const draftVars = [v('host', 'h')];
      const baseline = { host: 'h' };
      const scriptVars = { host: 'h', __name__: 'Test' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline, { skipKeys: ['__name__'] });
      expect(result.find((x) => x.name === '__name__')).toBeUndefined();
    });

    it('preserves dataType on an existing var when only its value is updated', () => {
      const draftVars = [{ ...v('count', 41), dataType: 'number' }];
      const baseline = { count: 40 };
      const scriptVars = { count: 42 };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      const out = result.find((x) => x.name === 'count');
      expect(out.value).toBe(42);
      expect(out.dataType).toBe('number');
    });

    it('preserves dataType on a disabled typed var that the script does not touch', () => {
      const draftVars = [v('host', 'h'), { ...v('flag', false, false), dataType: 'boolean' }];
      const baseline = { host: 'h', flag: false };
      const scriptVars = { host: 'h' };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      const out = result.find((x) => x.name === 'flag');
      expect(out).toMatchObject({ name: 'flag', enabled: false, dataType: 'boolean' });
    });

    it('combined: script adds, modifies, deletes; draft edits to unchanged vars are preserved', () => {
      const draftVars = [
        v('host', 'draft-host'), // user-edited, script will leave value matching baseline
        v('token', 'draft-token'), // user-edited, script will override
        v('stale', 'draft-stale'), // script will delete (was in baseline)
        v('draft-only', 'user-added') // user-only, not in baseline
      ];
      const baseline = {
        host: 'saved-host',
        token: 'saved-token',
        stale: 'saved-stale'
      };
      const scriptVars = {
        host: 'saved-host', // unchanged from baseline → draft 'draft-host' wins
        token: 'script-new-token', // modified → script wins
        added: 'from-script' // new → added
      };

      const result = applyScriptEnvVars(draftVars, scriptVars, baseline);
      const byName = Object.fromEntries(result.map((x) => [x.name, x.value]));
      expect(byName).toEqual({
        'host': 'draft-host',
        'token': 'script-new-token',
        'added': 'from-script',
        'draft-only': 'user-added'
      });
      expect(result.find((x) => x.name === 'stale')).toBeUndefined();
    });
  });

  describe('secret flag preservation', () => {
    const secretVar = (name, value, enabled = true) => ({
      uid: `uid-${name}`,
      name,
      value,
      type: 'text',
      secret: true,
      enabled
    });

    it('preserves secret: true when script updates an enabled secret var (baseline mode)', () => {
      const result = applyScriptEnvVars(
        [secretVar('apiToken', 'old')],
        { apiToken: 'new' },
        { apiToken: 'old' }
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'apiToken', value: 'new', secret: true, enabled: true });
    });

    it('preserves secret: true in direct-apply (no baseline) mode', () => {
      const result = applyScriptEnvVars([secretVar('apiToken', 'old')], { apiToken: 'new' }, null);
      expect(result[0]).toMatchObject({ name: 'apiToken', value: 'new', secret: true });
    });
  });
});

describe('Env export → import round-trip via JSON', () => {
  it('preserves dataType across export → JSON.stringify → JSON.parse → import for every supported type', () => {
    const reduxEnvVars = [
      { uid: 'u1', name: 'count', value: 42, type: 'text', enabled: true, secret: false, dataType: 'number' },
      { uid: 'u2', name: 'flag', value: true, type: 'text', enabled: true, secret: false, dataType: 'boolean' },
      { uid: 'u3', name: 'cfg', value: { k: 1 }, type: 'text', enabled: true, secret: false, dataType: 'object' },
      { uid: 'u4', name: 'greeting', value: 'hi', type: 'text', enabled: true, secret: false, dataType: 'string' },
      { uid: 'u5', name: 'plain', value: 'hello', type: 'text', enabled: true, secret: false },
      { uid: 'u6', name: 'token', value: 'shh', type: 'text', enabled: true, secret: true, dataType: 'number' }
    ];

    const exported = reduxEnvVars.map((envVariable) => buildEnvVariable({ envVariable }));
    const onDisk = JSON.parse(JSON.stringify(exported));

    expect(onDisk[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number', secret: false });
    expect(onDisk[1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean', secret: false });
    expect(onDisk[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, dataType: 'object', secret: false });
    expect(onDisk[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(onDisk[3].dataType).toBeUndefined();
    expect(onDisk[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(onDisk[4].dataType).toBeUndefined();
    expect(onDisk[5]).toMatchObject({ name: 'token', value: '', secret: true, dataType: 'number' });

    const reimported = onDisk.map((envVariable) => buildEnvVariable({ envVariable, withUuid: true }));
    expect(reimported[0]).toMatchObject({ name: 'count', value: 42, dataType: 'number', secret: false });
    expect(reimported[1]).toMatchObject({ name: 'flag', value: true, dataType: 'boolean', secret: false });
    expect(reimported[2]).toMatchObject({ name: 'cfg', value: { k: 1 }, dataType: 'object', secret: false });
    expect(reimported[3]).toMatchObject({ name: 'greeting', value: 'hi', secret: false });
    expect(reimported[3].dataType).toBeUndefined();
    expect(reimported[4]).toMatchObject({ name: 'plain', value: 'hello', secret: false });
    expect(reimported[4].dataType).toBeUndefined();
    expect(reimported[5]).toMatchObject({ name: 'token', value: '', secret: true, dataType: 'number' });
  });
});
