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
