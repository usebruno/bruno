const Bru = require('../src/bru');

const makeBru = (opts = {}) =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/',
    collectionName: 'Test',
    ...opts
  });

describe('Bru.iterationData', () => {
  test('returns undefined for unknown key when no iterationData provided', () => {
    const bru = makeBru();
    expect(bru.iterationData.get('anything')).toBeUndefined();
  });

  test('returns the value for a known key', () => {
    const bru = makeBru({ iterationData: { userId: '42', name: 'Alice' } });
    expect(bru.iterationData.get('userId')).toBe('42');
    expect(bru.iterationData.get('name')).toBe('Alice');
  });

  test('returns undefined for unknown key when iterationData provided', () => {
    const bru = makeBru({ iterationData: { userId: '1' } });
    expect(bru.iterationData.get('missing')).toBeUndefined();
  });

  test('toObject returns a copy of all iteration data', () => {
    const data = { a: '1', b: '2' };
    const bru = makeBru({ iterationData: data });
    const result = bru.iterationData.toObject();
    expect(result).toEqual(data);
    expect(result).not.toBe(data); // must be a copy
  });

  test('toObject returns empty object when no iterationData provided', () => {
    const bru = makeBru();
    expect(bru.iterationData.toObject()).toEqual({});
  });

  test('mutations on toObject result do not affect internal data', () => {
    const bru = makeBru({ iterationData: { key: 'original' } });
    const copy = bru.iterationData.toObject();
    copy.key = 'mutated';
    expect(bru.iterationData.get('key')).toBe('original');
  });
});

describe('Bru.iteration', () => {
  test('defaults to index 0 when iterationIndex not provided', () => {
    const bru = makeBru();
    expect(bru.iteration.index).toBe(0);
  });

  test('reflects the provided iterationIndex', () => {
    const bru = makeBru({ iterationIndex: 3 });
    expect(bru.iteration.index).toBe(3);
  });

  test('reflects iterationIndex of 0 explicitly', () => {
    const bru = makeBru({ iterationIndex: 0 });
    expect(bru.iteration.index).toBe(0);
  });
});
