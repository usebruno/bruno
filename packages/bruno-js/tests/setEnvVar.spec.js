const Bru = require('../src/bru');

const makeBru = () =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/',
    collectionName: 'Test'
  });

describe('bru.setEnvVar', () => {
  test('sets envVariables[key] to value', () => {
    const bru = makeBru();
    bru.setEnvVar('token', 'abc123');
    expect(bru.envVariables.token).toBe('abc123');
  });

  test('allows non-string values', () => {
    const bru = makeBru();
    bru.setEnvVar('count', 42);
    expect(bru.envVariables.count).toBe(42);

    bru.setEnvVar('active', true);
    expect(bru.envVariables.active).toBe(true);

    bru.setEnvVar('config', { port: 3000 });
    expect(bru.envVariables.config).toEqual({ port: 3000 });
  });

  test('overwrites existing value', () => {
    const bru = makeBru();
    bru.setEnvVar('key', 'old');
    bru.setEnvVar('key', 'new');
    expect(bru.envVariables.key).toBe('new');
  });

  test('throws when key is empty', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('', 'v')).toThrow(/without specifying a name/);
  });

  test('rejects key with invalid characters', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });
});

describe('bru.setEnvVar — dirty flag for typed values', () => {
  test('setting a number trips the env dirty flag', () => {
    const bru = makeBru();
    expect(bru._envDirty).toBe(false);
    bru.setEnvVar('count', 42);
    expect(bru._envDirty).toBe(true);
  });

  test('setting a boolean trips the env dirty flag', () => {
    const bru = makeBru();
    bru.setEnvVar('active', true);
    expect(bru._envDirty).toBe(true);
  });

  test('setting an object trips the env dirty flag', () => {
    const bru = makeBru();
    bru.setEnvVar('config', { port: 3000 });
    expect(bru._envDirty).toBe(true);
  });
});

describe('bru.deleteEnvVar', () => {
  test('removes an existing variable', () => {
    const bru = makeBru();
    bru.setEnvVar('token', 'abc');
    bru.deleteEnvVar('token');
    expect(bru.envVariables.token).toBeUndefined();
  });

  test('deleting a non-existent key is a silent no-op', () => {
    const bru = makeBru();
    expect(() => bru.deleteEnvVar('missing')).not.toThrow();
  });

  test('does not delete the internal __name__ marker', () => {
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: { __name__: 'dev', token: 'abc' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    bru.deleteEnvVar('__name__');
    expect(bru.envVariables.__name__).toBe('dev');
    expect(bru._envDirty).toBe(false);
  });
});

describe('bru.setEnvVar — dirty flag for reference-mutation idiom', () => {
  test('the getEnvVar → mutate → setEnvVar idiom trips the dirty flag', () => {
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: { config: { port: 3000 } },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    expect(bru._envDirty).toBe(false);
    // Real-script idiom: `const c = bru.getEnvVar('config'); c.port = 4000; bru.setEnvVar('config', c);`
    // `getEnvVar` deep-copies through interpolate's JSON roundtrip, so mutating the result
    // leaves envVariables.config untouched; the deep-equal guard then sees a real change.
    // Pre-fix the strict-`!==` guard missed cases where the script structurally rebuilt the value.
    const config = bru.getEnvVar('config');
    config.port = 4000;
    bru.setEnvVar('config', config);
    expect(bru._envDirty).toBe(true);
    expect(bru.envVariables.config).toEqual({ port: 4000 });
  });

  test('re-setting a structurally-equal object value does NOT trip the dirty flag', () => {
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: { config: { port: 3000 } },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    bru.setEnvVar('config', { port: 3000 });
    expect(bru._envDirty).toBe(false);
  });

  test('re-setting a structurally-equal primitive value does NOT trip the dirty flag', () => {
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: { token: 'abc' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    bru.setEnvVar('token', 'abc');
    expect(bru._envDirty).toBe(false);
  });
});

describe('bru.deleteEnvVar — dirty flag contract', () => {
  test('deleting an existing key trips the env dirty flag', () => {
    const bru = makeBru();
    bru.setEnvVar('token', 'abc');
    bru._envDirty = false; // reset post-set
    bru.deleteEnvVar('token');
    expect(bru._envDirty).toBe(true);
  });

  test('deleting a non-existent key leaves the dirty flag clean', () => {
    const bru = makeBru();
    bru.deleteEnvVar('missing');
    expect(bru._envDirty).toBe(false);
  });
});

describe('bru.deleteAllEnvVars — dirty flag contract', () => {
  test('deleting populated env trips the dirty flag', () => {
    const bru = new Bru({
      runtime: 'quickjs',
      envVariables: { a: '1', b: '2' },
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });
    bru.deleteAllEnvVars();
    expect(bru._envDirty).toBe(true);
  });

  test('calling on empty env leaves the dirty flag clean', () => {
    const bru = makeBru();
    bru.deleteAllEnvVars();
    expect(bru._envDirty).toBe(false);
  });
});

describe('bru.deleteAll* methods — resilient to user-shadowed Object.prototype methods', () => {
  // Use Object.hasOwn (not the property accessor) to check deletion, since after
  // delete the prototype's hasOwnProperty becomes visible again on a plain object.
  test('deleteAllEnvVars works when a var named "hasOwnProperty" was set', () => {
    const bru = makeBru();
    bru.setEnvVar('hasOwnProperty', 'shadow');
    bru.setEnvVar('other', 'value');
    expect(() => bru.deleteAllEnvVars()).not.toThrow();
    expect(Object.hasOwn(bru.envVariables, 'hasOwnProperty')).toBe(false);
    expect(Object.hasOwn(bru.envVariables, 'other')).toBe(false);
  });

  test('deleteAllGlobalEnvVars works when a var named "hasOwnProperty" was set', () => {
    const bru = makeBru();
    bru.setGlobalEnvVar('hasOwnProperty', 'shadow');
    bru.setGlobalEnvVar('other', 'value');
    expect(() => bru.deleteAllGlobalEnvVars()).not.toThrow();
    expect(Object.hasOwn(bru.globalEnvironmentVariables, 'hasOwnProperty')).toBe(false);
  });

  test('deleteAllCollectionVars works when a var named "hasOwnProperty" was set', () => {
    const bru = makeBru();
    bru.setCollectionVar('hasOwnProperty', 'shadow');
    bru.setCollectionVar('other', 'value');
    expect(() => bru.deleteAllCollectionVars()).not.toThrow();
    expect(Object.hasOwn(bru.collectionVariables, 'hasOwnProperty')).toBe(false);
  });

  test('deleteAllVars works when a runtime var named "hasOwnProperty" was set', () => {
    const bru = makeBru();
    bru.setVar('hasOwnProperty', 'shadow');
    bru.setVar('other', 'value');
    expect(() => bru.deleteAllVars()).not.toThrow();
    expect(Object.hasOwn(bru.runtimeVariables, 'hasOwnProperty')).toBe(false);
  });
});
