jest.mock('nanoid', () => ({
  nanoid: () => 'aaaaaaaaaaaaaaaaaaaa1',
  customAlphabet: () => () => 'aaaaaaaaaaaaaaaaaaaa1'
}));

import { applyScriptEnvVars, buildEnvVariable, stripEnvVarUid, getDuplicateSecretNames, writesCollidingSecrets, resolveSecretNameCollision, dedupeImportedSecrets, isEnvironmentValidationError, DUPLICATE_SECRET_NAMES_ERROR } from './environments';
import { invalidVariableNamesError } from './common/variables';

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

  it('preserves non-empty descriptions on export', () => {
    expect(buildEnvVariable({
      envVariable: { name: 'host', value: 'http://localhost', secret: false, description: 'Single-line host desc' }
    })).toEqual({
      name: 'host',
      value: 'http://localhost',
      type: 'text',
      enabled: true,
      secret: false,
      description: 'Single-line host desc'
    });

    expect(buildEnvVariable({
      envVariable: {
        name: 'secretToken',
        value: 'shh',
        secret: true,
        description: 'Secret line one\nSecret line two'
      }
    })).toEqual({
      name: 'secretToken',
      value: '',
      type: 'text',
      enabled: true,
      secret: true,
      description: 'Secret line one\nSecret line two'
    });
  });

  it('omits empty descriptions', () => {
    const out = buildEnvVariable({ envVariable: { name: 'plain', value: 'x', secret: false, description: '' } });
    expect(out.description).toBeUndefined();
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

  it('keeps non-empty descriptions', () => {
    expect(stripEnvVarUid({
      uid: 'u',
      name: 'host',
      value: 'http://localhost',
      type: 'text',
      enabled: true,
      secret: false,
      description: 'Single-line host desc'
    })).toEqual({
      name: 'host',
      value: 'http://localhost',
      type: 'text',
      enabled: true,
      secret: false,
      description: 'Single-line host desc'
    });
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

  describe('secret name collisions cleared by a script write', () => {
    const secret = (uid, name, value, enabled = true) => ({
      uid,
      name,
      value,
      type: 'text',
      secret: true,
      enabled
    });
    const plain = (uid, name, value) => ({ ...secret(uid, name, value), secret: false });

    it('collapses same-named secrets to the row the value was written to (direct-apply)', () => {
      const result = applyScriptEnvVars(
        [secret('uid-1', 'token', 'first'), secret('uid-2', 'token', 'second')],
        { token: 'from-script' },
        null
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ uid: 'uid-1', name: 'token', value: 'from-script', secret: true });
    });

    it('collapses same-named secrets in baseline mode when the script modified the value', () => {
      const result = applyScriptEnvVars(
        [secret('uid-1', 'token', 'old'), secret('uid-2', 'token', 'shadowed')],
        { token: 'new' },
        { token: 'old' }
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ uid: 'uid-1', value: 'new' });
    });

    it('leaves a collision the script never wrote to alone', () => {
      const result = applyScriptEnvVars(
        [secret('uid-1', 'token', 'a'), secret('uid-2', 'token', 'b'), plain('uid-3', 'host', 'old')],
        { token: 'a', host: 'new' },
        { token: 'a', host: 'old' }
      );

      expect(result.filter((v) => v.name === 'token')).toHaveLength(2);
      expect(result.find((v) => v.name === 'host').value).toBe('new');
    });

    it('keeps the enabled row when an earlier namesake is disabled', () => {
      const result = applyScriptEnvVars(
        [secret('uid-1', 'token', 'parked', false), secret('uid-2', 'token', 'live')],
        { token: 'from-script' },
        null
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ uid: 'uid-2', value: 'from-script', enabled: true });
    });

    it('does not collapse non-secret duplicates', () => {
      const result = applyScriptEnvVars(
        [plain('uid-1', 'host', 'a'), plain('uid-2', 'host', 'b')],
        { host: 'from-script' },
        null
      );

      expect(result).toHaveLength(2);
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

describe('getDuplicateSecretNames', () => {
  it('returns an empty set when there are no variables', () => {
    expect(getDuplicateSecretNames([]).size).toBe(0);
    expect(getDuplicateSecretNames(undefined).size).toBe(0);
  });

  it('returns an empty set when secret names are unique', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'apiKey', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('flags a name carried by more than one secret', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'token', secret: true }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('flags a collision even when one of the two secrets is disabled', () => {
    const vars = [
      { name: 'token', secret: true, enabled: true },
      { name: 'token', secret: true, enabled: false }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('ignores duplicate names on non-secret variables', () => {
    const vars = [
      { name: 'host', secret: false },
      { name: 'host', secret: false }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('does not flag a plain variable and a secret that share a name', () => {
    const vars = [
      { name: 'token', secret: false },
      { name: 'token', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });

  it('compares trimmed names and ignores blank ones', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: '  token  ', secret: true },
      { name: '   ', secret: true },
      { name: '', secret: true }
    ];
    expect([...getDuplicateSecretNames(vars)]).toEqual(['token']);
  });

  it('is case-sensitive', () => {
    const vars = [
      { name: 'token', secret: true },
      { name: 'TOKEN', secret: true }
    ];
    expect(getDuplicateSecretNames(vars).size).toBe(0);
  });
});

describe('isEnvironmentValidationError', () => {
  it('recognises the duplicate-secret-names rejection', () => {
    expect(isEnvironmentValidationError(new Error(DUPLICATE_SECRET_NAMES_ERROR))).toBe(true);
  });

  it('recognises an invalid-variable-names rejection regardless of the names listed', () => {
    expect(isEnvironmentValidationError(new Error(invalidVariableNamesError(['my var', 'a b'])))).toBe(true);
  });

  it('does not claim an unrelated save failure', () => {
    expect(isEnvironmentValidationError(new Error('Environment not found'))).toBe(false);
  });

  it('tolerates a missing or message-less rejection', () => {
    expect(isEnvironmentValidationError(undefined)).toBe(false);
    expect(isEnvironmentValidationError({})).toBe(false);
  });
});

describe('writesCollidingSecrets', () => {
  const secret = (name, value = `${name}-value`, overrides = {}) => ({
    uid: `uid-${name}-${value}`,
    name,
    value,
    type: 'text',
    enabled: true,
    secret: true,
    ...overrides
  });
  const plain = (name, value = `${name}-value`) => ({ ...secret(name, value), secret: false });

  // Two secrets sharing a name, as an imported or hand-edited file can carry.
  const collidingPair = [secret('token', 'first'), secret('token', 'second')];

  it('allows a save with no duplicate secrets', () => {
    const vars = [plain('host'), secret('token')];
    expect(writesCollidingSecrets(vars, vars)).toBe(false);
  });

  it('allows editing ordinary variables while a pre-existing collision is carried over untouched', () => {
    const saved = [plain('host', 'old'), ...collidingPair];
    const submitted = [plain('host', 'new'), plain('port'), ...collidingPair];

    expect(writesCollidingSecrets(submitted, saved)).toBe(false);
  });

  it('blocks a save that changes the secrets while they still collide', () => {
    const saved = [plain('host'), ...collidingPair];
    const submitted = [plain('host'), secret('token', 'first'), secret('token', 'edited')];

    expect(writesCollidingSecrets(submitted, saved)).toBe(true);
  });

  it('blocks a save that newly introduces a collision', () => {
    const saved = [secret('token', 'first')];
    const submitted = [secret('token', 'first'), secret('token', 'second')];

    expect(writesCollidingSecrets(submitted, saved)).toBe(true);
  });

  it('blocks adding an unrelated secret while a collision remains', () => {
    const saved = [...collidingPair];
    const submitted = [...collidingPair, secret('apiKey')];

    expect(writesCollidingSecrets(submitted, saved)).toBe(true);
  });

  it('allows a save that resolves the collision by renaming', () => {
    const saved = [...collidingPair];
    const submitted = [secret('token', 'first'), secret('tokenBackup', 'second')];

    expect(writesCollidingSecrets(submitted, saved)).toBe(false);
  });

  it('treats uid-only differences in the secrets as unchanged', () => {
    const saved = [plain('host'), ...collidingPair];
    const submitted = [plain('host'), ...collidingPair.map((v) => ({ ...v, uid: `regenerated-${v.value}` }))];

    expect(writesCollidingSecrets(submitted, saved)).toBe(false);
  });

  it('blocks a collision when there are no saved variables to compare against', () => {
    expect(writesCollidingSecrets(collidingPair, undefined)).toBe(true);
    expect(writesCollidingSecrets(collidingPair, [])).toBe(true);
  });
});

describe('resolveSecretNameCollision', () => {
  const makeSecret = (uid, name, value, overrides = {}) => ({
    uid,
    name,
    value,
    type: 'text',
    enabled: true,
    secret: true,
    ...overrides
  });

  it('keeps the edited row and drops the other secrets sharing its name', () => {
    const edited = makeSecret('uid-1', 'token', 'edited');
    const variables = [edited, makeSecret('uid-2', 'token', 'stale'), makeSecret('uid-3', 'apiKey', 'other')];

    expect(resolveSecretNameCollision(variables, edited)).toEqual([edited, variables[2]]);
  });

  it('keeps the edited row even when it is not the first of the duplicates', () => {
    const edited = makeSecret('uid-2', 'token', 'edited');
    const variables = [makeSecret('uid-1', 'token', 'stale'), edited];

    expect(resolveSecretNameCollision(variables, edited)).toEqual([edited]);
  });

  // Secret values are stored under the untrimmed name, so these are two separately readable
  // secrets rather than one collision.
  it('leaves a whitespace-padded namesake alone, since it is a different stored key', () => {
    const edited = makeSecret('uid-1', 'token', 'edited');
    const padded = makeSecret('uid-2', '  token  ', 'stale');
    const variables = [edited, padded];

    expect(resolveSecretNameCollision(variables, edited)).toEqual([edited, padded]);
  });

  it('leaves a non-secret of the same name alone', () => {
    const edited = makeSecret('uid-1', 'token', 'edited');
    const plain = makeSecret('uid-2', 'token', 'plain', { secret: false });
    const variables = [edited, plain, makeSecret('uid-3', 'token', 'stale')];

    expect(resolveSecretNameCollision(variables, edited)).toEqual([edited, plain]);
  });

  it('returns the list untouched when the edited secret has no collision', () => {
    const edited = makeSecret('uid-1', 'apiKey', 'edited');
    const variables = [edited, makeSecret('uid-2', 'token', 'other')];

    expect(resolveSecretNameCollision(variables, edited)).toBe(variables);
  });

  it('returns the list untouched when the edited variable is not a secret', () => {
    const plain = makeSecret('uid-1', 'token', 'edited', { secret: false });
    const variables = [plain, makeSecret('uid-2', 'token', 'a'), makeSecret('uid-3', 'token', 'b')];

    expect(resolveSecretNameCollision(variables, plain)).toBe(variables);
  });

  it('drops every namesake when more than two collide', () => {
    const edited = makeSecret('uid-1', 'token', 'edited');
    const variables = [edited, makeSecret('uid-2', 'token', 'a'), makeSecret('uid-3', 'token', 'b')];

    expect(resolveSecretNameCollision(variables, edited)).toEqual([edited]);
  });
});

describe('dedupeImportedSecrets', () => {
  const makeVar = (uid, name, value, overrides = {}) => ({
    uid,
    name,
    value,
    type: 'text',
    enabled: true,
    secret: true,
    ...overrides
  });

  it('returns the list untouched when secret names are unique', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'apiKey', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('collapses two blank-valued secrets sharing a name down to the first', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('collapses every namesake when more than two collide', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', ''), makeVar('uid-3', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('collapses each colliding name independently and keeps the rest in order', () => {
    const variables = [
      makeVar('uid-1', 'apiKey', 'plain', { secret: false }),
      makeVar('uid-2', 'name', ''),
      makeVar('uid-3', 'name', ''),
      makeVar('uid-4', 'abc', ''),
      makeVar('uid-5', 'abc', '')
    ];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0], variables[1], variables[3]]);
  });

  // A Postman export ships secret values inline, so the twin holding one carries the only value
  // that survives the collision.
  it('keeps the twin holding a value over an earlier blank one', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', 'from-postman')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[1]]);
  });

  it('keeps the first of several twins holding values', () => {
    const variables = [makeVar('uid-1', 'token', 'first'), makeVar('uid-2', 'token', 'second')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('leaves duplicate non-secret names alone', () => {
    const variables = [makeVar('uid-1', 'host', 'a', { secret: false }), makeVar('uid-2', 'host', 'b', { secret: false })];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('leaves a plain variable sharing a secret name alone', () => {
    const variables = [makeVar('uid-1', 'token', 'plain', { secret: false }), makeVar('uid-2', 'token', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  // Unlike resolveSecretNameCollision, nothing is stored yet, so there is no live value hiding
  // under the untrimmed key and the padded namesake is safe to collapse.
  it('collapses a whitespace-padded namesake, keeping the survivor name verbatim', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', '  token  ', '')];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[0]]);
  });

  it('ignores blank secret names', () => {
    const variables = [makeVar('uid-1', '', ''), makeVar('uid-2', '   ', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('treats names differing only in case as distinct', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'TOKEN', '')];

    expect(dedupeImportedSecrets(variables)).toBe(variables);
  });

  it('keeps a disabled twin when it is the one holding a value', () => {
    const variables = [makeVar('uid-1', 'token', ''), makeVar('uid-2', 'token', 'kept', { enabled: false })];

    expect(dedupeImportedSecrets(variables)).toEqual([variables[1]]);
  });
});
