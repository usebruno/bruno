import { collectionsSlice } from './index';

const {
  setRequestVars,
  setFolderVars,
  setCollectionVars,
  collectionAddEnvFileEvent,
  scriptEnvironmentUpdateEvent
} = collectionsSlice.actions;
const reducer = collectionsSlice.reducer;

const makeStateWith = (item) => ({
  collections: [
    {
      uid: 'col1',
      items: [item]
    }
  ]
});

const inputVars = [
  { uid: 'v1', name: 'numeric', value: 42, enabled: true, dataType: 'number' },
  { uid: 'v2', name: 'explicit_string', value: 'hi', enabled: true, dataType: 'string' },
  { uid: 'v3', name: 'plain', value: 'hello', enabled: true }
];

const assertGuardedVars = (vars) => {
  expect(vars).toHaveLength(3);
  expect(vars[0]).toMatchObject({ name: 'numeric', value: 42, dataType: 'number' });
  expect(vars[1]).toMatchObject({ name: 'explicit_string', value: 'hi' });
  expect(vars[1].dataType).toBeUndefined();
  expect(vars[2]).toMatchObject({ name: 'plain', value: 'hello' });
  expect(vars[2].dataType).toBeUndefined();
};

describe('collectionAddEnvFileEvent — ephemeral env vars on disk reload', () => {
  const stateWithEnv = (variables) => ({
    collections: [
      {
        uid: 'col1',
        items: [],
        environments: [{ uid: 'env1', name: 'dev', pathname: '/dev.bru', variables }]
      }
    ]
  });

  // A persist:true setEnvVar writes the file, which reloads only the persisted var.
  const fileReload = reducer(
    stateWithEnv([
      { uid: 'v1', name: 'test_env_var', value: 'test', ephemeral: true },
      { uid: 'v2', name: 'test_env_var_test', value: 'test', ephemeral: false }
    ]),
    collectionAddEnvFileEvent({
      collectionUid: 'col1',
      environment: {
        uid: 'env1',
        name: 'dev',
        pathname: '/dev.bru',
        variables: [{ uid: 'v2', name: 'test_env_var_test', value: 'test' }]
      }
    })
  );
  const reloadedVars = fileReload.collections[0].environments[0].variables;

  it('keeps a script-created ephemeral var absent from the reloaded file', () => {
    const kept = reloadedVars.find((v) => v.name === 'test_env_var');
    expect(kept).toMatchObject({ name: 'test_env_var', value: 'test', ephemeral: true });
  });

  it('drops an overlay ephemeral (persistedValue set) absent from the reloaded file', () => {
    const next = reducer(
      stateWithEnv([{ uid: 'v1', name: 'deleted_overlay', value: 'temp', ephemeral: true, persistedValue: 'orig' }]),
      collectionAddEnvFileEvent({
        collectionUid: 'col1',
        environment: { uid: 'env1', name: 'dev', pathname: '/dev.bru', variables: [] }
      })
    );

    expect(next.collections[0].environments[0].variables).toHaveLength(0);
  });
});

describe('scriptEnvironmentUpdateEvent — re-updating a script-created ephemeral var', () => {
  const stateWithEnvVar = (variable) => ({
    collections: [
      {
        uid: 'col1',
        items: [],
        activeEnvironmentUid: 'env1',
        environments: [{ uid: 'env1', name: 'dev', variables: [variable] }]
      }
    ]
  });

  it('does not give a script-created ephemeral var a persistedValue when its value changes again', () => {
    // First run left this in Redux: created by setEnvVar (persist:false), never on disk.
    const existing = { uid: 'v1', name: 'test_env_var', value: 'test', enabled: true, ephemeral: true };

    const next = reducer(
      stateWithEnvVar(existing),
      scriptEnvironmentUpdateEvent({
        collectionUid: 'col1',
        envVariables: { test_env_var: 'updated' },
        runtimeVariables: {},
        persistentEnvVariables: {}
      })
    );

    const variable = next.collections[0].environments[0].variables[0];
    expect(variable).toMatchObject({ name: 'test_env_var', value: 'updated', ephemeral: true });
    expect(variable.persistedValue).toBeUndefined();
  });

  it('captures the on-disk base as persistedValue when first shadowing a real var', () => {
    const onDisk = { uid: 'v1', name: 'api_url', value: 'https://disk', enabled: true };

    const next = reducer(
      stateWithEnvVar(onDisk),
      scriptEnvironmentUpdateEvent({
        collectionUid: 'col1',
        envVariables: { api_url: 'https://overlay' },
        runtimeVariables: {},
        persistentEnvVariables: {}
      })
    );

    const variable = next.collections[0].environments[0].variables[0];
    expect(variable).toMatchObject({ value: 'https://overlay', ephemeral: true, persistedValue: 'https://disk' });
  });
});

describe('setRequestVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on request vars and preserves typed datatypes', () => {
    const item = {
      uid: 'item1',
      type: 'http-request',
      request: { vars: { req: [], res: [] } }
    };

    const next = reducer(
      makeStateWith(item),
      setRequestVars({ collectionUid: 'col1', itemUid: 'item1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].items[0].draft.request.vars.req);
  });
});

describe('setFolderVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on folder vars and preserves typed datatypes', () => {
    const folder = {
      uid: 'folder1',
      type: 'folder',
      root: { request: { vars: { req: [], res: [] } } }
    };

    const next = reducer(
      makeStateWith(folder),
      setFolderVars({ collectionUid: 'col1', folderUid: 'folder1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].items[0].draft.request.vars.req);
  });
});

describe('setCollectionVars — strips dataType: \'string\' (implicit default)', () => {
  it('drops a stray string-dataType on collection vars and preserves typed datatypes', () => {
    const state = {
      collections: [
        {
          uid: 'col1',
          items: [],
          root: { request: { vars: { req: [], res: [] } } }
        }
      ]
    };

    const next = reducer(
      state,
      setCollectionVars({ collectionUid: 'col1', vars: inputVars, type: 'request' })
    );

    assertGuardedVars(next.collections[0].draft.root.request.vars.req);
  });
});
