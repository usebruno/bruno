const Bru = require('../src/bru');

describe('Global Environment Variable APIs', () => {
  const makeBru = (globalEnvironmentVariables = {}) =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test',
      globalEnvironmentVariables
    });

  describe('bru.setGlobalEnvVar', () => {
    test('sets a new global env variable', () => {
      const bru = makeBru();
      bru.setGlobalEnvVar('apiKey', 'abc123');
      expect(bru.globalEnvironmentVariables.apiKey).toBe('abc123');
    });

    test('overwrites an existing variable', () => {
      const bru = makeBru({ apiKey: 'old' });
      bru.setGlobalEnvVar('apiKey', 'new');
      expect(bru.globalEnvironmentVariables.apiKey).toBe('new');
    });

    test('allows non-string values', () => {
      const bru = makeBru();
      bru.setGlobalEnvVar('count', 42);
      expect(bru.globalEnvironmentVariables.count).toBe(42);

      bru.setGlobalEnvVar('config', { port: 3000 });
      expect(bru.globalEnvironmentVariables.config).toEqual({ port: 3000 });
    });

    test('throws when key is empty', () => {
      const bru = makeBru();
      expect(() => bru.setGlobalEnvVar('', 'v')).toThrow(/without specifying a name/);
    });

    test('re-run: setting same key twice does not throw', () => {
      const bru = makeBru();
      bru.setGlobalEnvVar('key', 'first');
      bru.setGlobalEnvVar('key', 'second');
      expect(bru.globalEnvironmentVariables.key).toBe('second');
    });
  });

  describe('bru.getGlobalEnvVar', () => {
    test('returns value of an existing variable', () => {
      const bru = makeBru({ token: 'abc' });
      expect(bru.getGlobalEnvVar('token')).toBe('abc');
    });

    test('returns undefined for non-existent variable', () => {
      const bru = makeBru();
      expect(bru.getGlobalEnvVar('missing')).toBeUndefined();
    });
  });

  describe('bru.hasGlobalEnvVar', () => {
    test('returns true for existing variable', () => {
      const bru = makeBru({ token: 'abc' });
      expect(bru.hasGlobalEnvVar('token')).toBe(true);
    });

    test('returns false for non-existent variable', () => {
      const bru = makeBru();
      expect(bru.hasGlobalEnvVar('missing')).toBe(false);
    });
  });

  describe('bru.deleteGlobalEnvVar', () => {
    test('removes an existing variable', () => {
      const bru = makeBru({ token: 'abc' });
      bru.deleteGlobalEnvVar('token');
      expect(bru.globalEnvironmentVariables.token).toBeUndefined();
      expect(bru.hasGlobalEnvVar('token')).toBe(false);
    });

    test('re-run: deleting a non-existent key is a silent no-op', () => {
      const bru = makeBru();
      expect(() => bru.deleteGlobalEnvVar('missing')).not.toThrow();
    });

    test('re-run: deleting an already-deleted key is a silent no-op', () => {
      const bru = makeBru({ token: 'abc' });
      bru.deleteGlobalEnvVar('token');
      expect(() => bru.deleteGlobalEnvVar('token')).not.toThrow();
    });
  });

  describe('bru.deleteAllGlobalEnvVars', () => {
    test('removes all global env variables', () => {
      const bru = makeBru({ a: '1', b: '2', c: '3' });
      bru.deleteAllGlobalEnvVars();
      expect(bru.globalEnvironmentVariables).toEqual({});
    });

    test('re-run: calling on empty scope is a silent no-op', () => {
      const bru = makeBru();
      expect(() => bru.deleteAllGlobalEnvVars()).not.toThrow();
      expect(bru.globalEnvironmentVariables).toEqual({});
    });

    test('re-run: calling twice is a silent no-op', () => {
      const bru = makeBru({ a: '1' });
      bru.deleteAllGlobalEnvVars();
      expect(() => bru.deleteAllGlobalEnvVars()).not.toThrow();
    });
  });

  describe('bru.getAllGlobalEnvVars', () => {
    test('returns a copy of all global env variables', () => {
      const bru = makeBru({ a: '1', b: '2' });
      expect(bru.getAllGlobalEnvVars()).toEqual({ a: '1', b: '2' });
    });

    test('returned object is a copy, not a reference', () => {
      const bru = makeBru({ a: '1' });
      const all = bru.getAllGlobalEnvVars();
      all.a = 'mutated';
      expect(bru.globalEnvironmentVariables.a).toBe('1');
    });

    test('returns empty object when no variables exist', () => {
      const bru = makeBru();
      expect(bru.getAllGlobalEnvVars()).toEqual({});
    });
  });
});
