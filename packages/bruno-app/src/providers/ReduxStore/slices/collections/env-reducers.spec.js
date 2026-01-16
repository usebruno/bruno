const collectionsSlice = require('./index');

const reducer = collectionsSlice.default;
const { saveEnvironment, collectionAddEnvFileEvent } = collectionsSlice;

const makeState = (envVars = []) => ({
  collections: [{
    uid: 'col1',
    activeEnvironmentUid: 'env1',
    environments: [{
      uid: 'env1',
      name: 'Test',
      variables: envVars
    }]
  }]
});

describe('saveEnvironment reducer', () => {
  test('replaces variables with new set', () => {
    const state = makeState([{ uid: 'v1', name: 'old', value: 'a' }]);
    const action = saveEnvironment({
      collectionUid: 'col1',
      environmentUid: 'env1',
      variables: [{ uid: 'v2', name: 'new', value: 'b' }]
    });

    const result = reducer(state, action);
    const vars = result.collections[0].environments[0].variables;

    expect(vars).toHaveLength(1);
    expect(vars[0].name).toBe('new');
  });

  test('preserves ephemeral variables not in new set', () => {
    const state = makeState([
      { uid: 'v1', name: 'disk', value: 'a' },
      { uid: 'v2', name: 'runtime', value: 'b', ephemeral: true }
    ]);
    const action = saveEnvironment({
      collectionUid: 'col1',
      environmentUid: 'env1',
      variables: [{ uid: 'v1', name: 'disk', value: 'a' }]
    });

    const result = reducer(state, action);
    const vars = result.collections[0].environments[0].variables;

    expect(vars).toHaveLength(2);
    expect(vars.find((v) => v.name === 'runtime')).toBeDefined();
    expect(vars.find((v) => v.name === 'runtime').ephemeral).toBe(true);
  });

  test('overwrites ephemeral if new var has same name', () => {
    const state = makeState([
      { uid: 'v1', name: 'token', value: 'ephemeral', ephemeral: true }
    ]);
    const action = saveEnvironment({
      collectionUid: 'col1',
      environmentUid: 'env1',
      variables: [{ uid: 'v2', name: 'token', value: 'persisted' }]
    });

    const result = reducer(state, action);
    const vars = result.collections[0].environments[0].variables;

    expect(vars).toHaveLength(1);
    expect(vars[0].value).toBe('persisted');
    expect(vars[0].ephemeral).toBeUndefined();
  });
});

describe('collectionAddEnvFileEvent reducer', () => {
  test('updates environment variables from file', () => {
    const state = makeState([{ uid: 'v1', name: 'old', value: 'a' }]);
    const action = collectionAddEnvFileEvent({
      collectionUid: 'col1',
      environment: {
        uid: 'env1',
        name: 'Test',
        variables: [{ uid: 'v2', name: 'fromFile', value: 'b' }]
      }
    });

    const result = reducer(state, action);
    const vars = result.collections[0].environments[0].variables;

    expect(vars.some((v) => v.name === 'fromFile')).toBe(true);
  });

  test('re-adds purely ephemeral variables after file update', () => {
    const state = makeState([
      { uid: 'v1', name: 'disk', value: 'a' },
      { uid: 'v2', name: 'runtime', value: 'b', ephemeral: true }
    ]);
    const action = collectionAddEnvFileEvent({
      collectionUid: 'col1',
      environment: {
        uid: 'env1',
        name: 'Test',
        variables: [{ uid: 'v1', name: 'disk', value: 'a' }]
      }
    });

    const result = reducer(state, action);
    const vars = result.collections[0].environments[0].variables;

    expect(vars).toHaveLength(2);
    expect(vars.find((v) => v.name === 'runtime')).toBeDefined();
    expect(vars.find((v) => v.name === 'runtime').ephemeral).toBe(true);
  });

  test('re-applies ephemeral overlay to existing file var', () => {
    const state = makeState([
      { uid: 'v1', name: 'token', value: 'runtime-val', ephemeral: true, persistedValue: 'disk-val' }
    ]);
    const action = collectionAddEnvFileEvent({
      collectionUid: 'col1',
      environment: {
        uid: 'env1',
        name: 'Test',
        variables: [{ uid: 'v1', name: 'token', value: 'disk-val' }]
      }
    });

    const result = reducer(state, action);
    const v = result.collections[0].environments[0].variables[0];

    expect(v.value).toBe('runtime-val');
    expect(v.ephemeral).toBe(true);
  });
});
