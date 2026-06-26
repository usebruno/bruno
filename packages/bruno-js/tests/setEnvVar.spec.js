const Bru = require('../src/bru');
const { valueToString } = require('@usebruno/common/utils');

describe('Bru.setEnvVar', () => {
  const makeBru = () =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });

  test('updates envVariables and does not mark persistent when persist=false', () => {
    const bru = makeBru();
    bru.setEnvVar('non_persist', 'value', { persist: false });
    expect(bru.envVariables.non_persist).toBe('value');
    expect(bru.persistentEnvVariables.non_persist).toBeUndefined();
  });

  test('updates envVariables and tracks persistent when persist=true (string only)', () => {
    const bru = makeBru();
    bru.setEnvVar('persist_me', 'value', { persist: true });
    expect(bru.envVariables.persist_me).toBe('value');
    expect(bru.persistentEnvVariables.persist_me).toBe('value');
  });

  test('updates envVariables when options are omitted (defaults to non-persistent)', () => {
    const bru = makeBru();
    bru.setEnvVar('no_options', 'value');
    expect(bru.envVariables.no_options).toBe('value');
    expect(bru.persistentEnvVariables.no_options).toBeUndefined();
  });

  describe('persist=true with non-string values', () => {
    test('stores numbers as-is without throwing', () => {
      const bru = makeBru();
      expect(() => bru.setEnvVar('n', 123, { persist: true })).not.toThrow();
      expect(bru.envVariables.n).toBe(123);
      expect(bru.persistentEnvVariables.n).toBe(123);
    });

    test('stores booleans as-is without throwing', () => {
      const bru = makeBru();
      expect(() => bru.setEnvVar('b', true, { persist: true })).not.toThrow();
      expect(bru.persistentEnvVariables.b).toBe(true);
    });

    test('stores plain objects and arrays by reference without throwing', () => {
      const bru = makeBru();
      const obj = { a: 1 };
      const arr = [1, 2, 3];
      bru.setEnvVar('o', obj, { persist: true });
      bru.setEnvVar('a', arr, { persist: true });
      expect(bru.persistentEnvVariables.o).toBe(obj);
      expect(bru.persistentEnvVariables.a).toBe(arr);
    });

    test('stores functions and symbols without throwing — but they round-trip to "" via valueToString', () => {
      const bru = makeBru();
      const fn = () => 42;
      const sym = Symbol('s');
      bru.setEnvVar('fn', fn, { persist: true });
      bru.setEnvVar('sym', sym, { persist: true });

      // Raw values land in persistentEnvVariables...
      expect(bru.persistentEnvVariables.fn).toBe(fn);
      expect(bru.persistentEnvVariables.sym).toBe(sym);
      // ...but the serializer used by mergeAndPersistEnvironment produces ''
      // for both, so the value is silently lost on the next save round-trip.
      expect(valueToString(fn)).toBe('');
      expect(valueToString(sym)).toBe('');
    });

    test('stores circular objects without throwing — but they round-trip to "" via valueToString', () => {
      const bru = makeBru();
      const circular = { a: 1 };
      circular.self = circular;
      bru.setEnvVar('c', circular, { persist: true });

      expect(bru.persistentEnvVariables.c).toBe(circular);
      // JSON.stringify throws on circulars; valueToString swallows that and returns ''.
      expect(valueToString(circular)).toBe('');
    });
  });

  test('changing existing key to non-persistent removes prior persisted entry', () => {
    const bru = makeBru();
    bru.setEnvVar('same_key', 'old', { persist: true });
    expect(bru.persistentEnvVariables.same_key).toBe('old');

    bru.setEnvVar('same_key', 'new');
    expect(bru.envVariables.same_key).toBe('new');
    expect(bru.persistentEnvVariables.same_key).toBeUndefined();
  });

  test('changing existing key to persistent updates persisted value', () => {
    const bru = makeBru();
    bru.setEnvVar('same_key', 'old');
    expect(bru.persistentEnvVariables.same_key).toBeUndefined();

    bru.setEnvVar('same_key', 'new', { persist: true });
    expect(bru.envVariables.same_key).toBe('new');
    expect(bru.persistentEnvVariables.same_key).toBe('new');
  });

  test('validates key name - invalid characters are rejected', () => {
    const bru = makeBru();
    expect(() => bru.setEnvVar('invalid key', 'v')).toThrow(/contains invalid characters/);
  });
});
