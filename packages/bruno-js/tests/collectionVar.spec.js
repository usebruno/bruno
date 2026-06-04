const Bru = require('../src/bru');

describe('Collection Variable APIs', () => {
  const makeBru = (collectionVariables = {}) =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test',
      collectionVariables
    });

  describe('bru.setCollectionVar', () => {
    test('sets a new collection variable', () => {
      const bru = makeBru();
      bru.setCollectionVar('baseUrl', 'https://api.example.com');
      expect(bru.collectionVariables.baseUrl).toBe('https://api.example.com');
    });

    test('overwrites an existing collection variable', () => {
      const bru = makeBru({ baseUrl: 'https://old.com' });
      bru.setCollectionVar('baseUrl', 'https://new.com');
      expect(bru.collectionVariables.baseUrl).toBe('https://new.com');
    });

    test('allows non-string values', () => {
      const bru = makeBru();
      bru.setCollectionVar('count', 42);
      expect(bru.collectionVariables.count).toBe(42);

      bru.setCollectionVar('active', true);
      expect(bru.collectionVariables.active).toBe(true);

      bru.setCollectionVar('config', { port: 3000 });
      expect(bru.collectionVariables.config).toEqual({ port: 3000 });
    });

    test('throws when key is empty', () => {
      const bru = makeBru();
      expect(() => bru.setCollectionVar('', 'v')).toThrow(/without specifying a name/);
    });

    test('throws when key has invalid characters', () => {
      const bru = makeBru();
      expect(() => bru.setCollectionVar('invalid key', 'v')).toThrow(/contains invalid characters/);
    });

    test('re-run: setting same key twice does not throw', () => {
      const bru = makeBru();
      bru.setCollectionVar('key', 'first');
      bru.setCollectionVar('key', 'second');
      expect(bru.collectionVariables.key).toBe('second');
    });
  });

  describe('bru.getCollectionVar', () => {
    test('returns the value of an existing variable', () => {
      const bru = makeBru({ token: 'abc123' });
      expect(bru.getCollectionVar('token')).toBe('abc123');
    });

    test('returns undefined for a non-existent variable', () => {
      const bru = makeBru();
      expect(bru.getCollectionVar('missing')).toBeUndefined();
    });
  });

  describe('bru.hasCollectionVar', () => {
    test('returns true for an existing variable', () => {
      const bru = makeBru({ token: 'abc' });
      expect(bru.hasCollectionVar('token')).toBe(true);
    });

    test('returns false for a non-existent variable', () => {
      const bru = makeBru();
      expect(bru.hasCollectionVar('missing')).toBe(false);
    });
  });

  describe('bru.deleteCollectionVar', () => {
    test('removes an existing variable', () => {
      const bru = makeBru({ token: 'abc' });
      bru.deleteCollectionVar('token');
      expect(bru.collectionVariables.token).toBeUndefined();
      expect(bru.hasCollectionVar('token')).toBe(false);
    });

    test('re-run: deleting a non-existent key is a silent no-op', () => {
      const bru = makeBru();
      expect(() => bru.deleteCollectionVar('missing')).not.toThrow();
    });

    test('re-run: deleting an already-deleted key is a silent no-op', () => {
      const bru = makeBru({ token: 'abc' });
      bru.deleteCollectionVar('token');
      expect(() => bru.deleteCollectionVar('token')).not.toThrow();
    });
  });

  describe('bru.deleteAllCollectionVars', () => {
    test('removes all collection variables', () => {
      const bru = makeBru({ a: '1', b: '2', c: '3' });
      bru.deleteAllCollectionVars();
      expect(bru.collectionVariables).toEqual({});
    });

    test('re-run: calling on empty scope is a silent no-op', () => {
      const bru = makeBru();
      expect(() => bru.deleteAllCollectionVars()).not.toThrow();
      expect(bru.collectionVariables).toEqual({});
    });

    test('re-run: calling twice is a silent no-op', () => {
      const bru = makeBru({ a: '1' });
      bru.deleteAllCollectionVars();
      expect(() => bru.deleteAllCollectionVars()).not.toThrow();
      expect(bru.collectionVariables).toEqual({});
    });
  });

  describe('bru.getAllCollectionVars', () => {
    test('returns a copy of all collection variables', () => {
      const bru = makeBru({ a: '1', b: '2' });
      const all = bru.getAllCollectionVars();
      expect(all).toEqual({ a: '1', b: '2' });
    });

    test('returned object is a copy, not a reference', () => {
      const bru = makeBru({ a: '1' });
      const all = bru.getAllCollectionVars();
      all.a = 'mutated';
      expect(bru.collectionVariables.a).toBe('1');
    });

    test('returns empty object when no variables exist', () => {
      const bru = makeBru();
      expect(bru.getAllCollectionVars()).toEqual({});
    });
  });
});
