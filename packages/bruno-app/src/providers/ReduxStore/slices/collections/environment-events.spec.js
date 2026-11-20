import reducer, { collectionAddEnvFileEvent, collectionUnlinkEnvFileEvent } from 'providers/ReduxStore/slices/collections';
import { collectionUnlinkEnvFileEvent as collectionUnlinkEnvFileEventThunk } from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';
const ENV_UID = 'env-1';

const externalSecrets = {
  type: 'my-vault',
  variables: [
    { name: 'secret', value: 'secret/data/secret' },
    { name: 'password', value: 'secret/data/password' }
  ]
};

const makeEnvironment = (overrides = {}) => ({
  uid: ENV_UID,
  name: 'test_env',
  pathname: '/coll/environments/test_env.bru',
  variables: [
    { uid: 'var-1', name: 'env_str', value: 'env_string', type: 'text', enabled: true, secret: false },
    { uid: 'var-2', name: 'env_num', value: '300', type: 'text', dataType: 'number', enabled: true, secret: false },
    { uid: 'var-3', name: 'env_bool', value: 'true', type: 'text', dataType: 'boolean', enabled: true, secret: false },
    { uid: 'var-4', name: 'env_obj', value: '{"scope":"env"}', type: 'text', dataType: 'object', enabled: true, secret: false }
  ],
  color: null,
  ...overrides
});

const makeInitialState = (environments = []) => ({
  collections: [
    {
      uid: COLLECTION_UID,
      pathname: '/coll',
      items: [],
      environments
    }
  ],
  collectionSortOrder: 'default',
  activeWorkspaceUid: null
});

describe('collectionAddEnvFileEvent', () => {
  it('keeps externalSecrets when a new environment is added', () => {
    const state = makeInitialState();

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment({ externalSecrets }), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toEqual(externalSecrets);
  });

  it('keeps externalSecrets when an existing environment changes', () => {
    const state = makeInitialState([makeEnvironment()]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment({ externalSecrets }), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toEqual(externalSecrets);
  });

  it('keeps variable dataType when a new environment is added', () => {
    const state = makeInitialState();

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    const variables = nextState.collections[0].environments[0].variables;
    expect(variables.find((v) => v.name === 'env_num')).toMatchObject({ value: '300', dataType: 'number' });
    expect(variables.find((v) => v.name === 'env_bool')).toMatchObject({ value: 'true', dataType: 'boolean' });
    expect(variables.find((v) => v.name === 'env_obj')).toMatchObject({ value: '{"scope":"env"}', dataType: 'object' });
    expect(variables.find((v) => v.name === 'env_str')).not.toHaveProperty('dataType');
  });

  it('keeps variable dataType when an existing environment changes', () => {
    const state = makeInitialState([makeEnvironment({ variables: [] })]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    const variables = nextState.collections[0].environments[0].variables;
    expect(variables.find((v) => v.name === 'env_num')).toMatchObject({ value: '300', dataType: 'number' });
    expect(variables.find((v) => v.name === 'env_str')).not.toHaveProperty('dataType');
  });

  it('clears externalSecrets when the block is removed from the file', () => {
    const state = makeInitialState([makeEnvironment({ externalSecrets })]);

    const nextState = reducer(
      state,
      collectionAddEnvFileEvent({ environment: makeEnvironment(), collectionUid: COLLECTION_UID })
    );

    expect(nextState.collections[0].environments[0].externalSecrets).toBeUndefined();
  });
});

describe('collectionUnlinkEnvFileEvent', () => {
  const unlink = (environment) => collectionUnlinkEnvFileEvent({ data: environment, meta: { collectionUid: COLLECTION_UID } });

  it('clears activeEnvironmentUid when the active environment file is removed', () => {
    const environment = makeEnvironment();
    const state = makeInitialState([environment]);
    state.collections[0].activeEnvironmentUid = ENV_UID;

    const nextState = reducer(state, unlink(environment));

    expect(nextState.collections[0].environments).toHaveLength(0);
    expect(nextState.collections[0].activeEnvironmentUid).toBeNull();
  });

  it('keeps activeEnvironmentUid when a different environment file is removed', () => {
    const activeEnvironment = makeEnvironment();
    const otherEnvironment = makeEnvironment({ uid: 'env-2', name: 'other_env', pathname: '/coll/environments/other_env.bru' });
    const state = makeInitialState([activeEnvironment, otherEnvironment]);
    state.collections[0].activeEnvironmentUid = ENV_UID;

    const nextState = reducer(state, unlink(otherEnvironment));

    expect(nextState.collections[0].environments.map((e) => e.uid)).toEqual([ENV_UID]);
    expect(nextState.collections[0].activeEnvironmentUid).toBe(ENV_UID);
  });
});

describe('collectionUnlinkEnvFileEvent thunk', () => {
  const payload = (environment) => ({ data: environment, meta: { collectionUid: COLLECTION_UID } });

  const makeGetState = (activeEnvironmentUid) => () => ({
    collections: {
      collections: [{ uid: COLLECTION_UID, pathname: '/coll', environments: [makeEnvironment()], activeEnvironmentUid }]
    },
    workspaces: {
      workspaces: [{ uid: 'ws-1', pathname: '/workspace' }],
      activeWorkspaceUid: 'ws-1'
    }
  });

  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue() };
  });

  afterEach(() => {
    delete window.ipcRenderer;
  });

  it('clears the persisted environment selection when the active environment file is removed', () => {
    const dispatch = jest.fn();

    collectionUnlinkEnvFileEventThunk(payload(makeEnvironment()))(dispatch, makeGetState(ENV_UID));

    expect(dispatch).toHaveBeenCalledWith(collectionUnlinkEnvFileEvent(payload(makeEnvironment())));
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:update-ui-state-snapshot', {
      type: 'COLLECTION_ENVIRONMENT',
      data: {
        collectionPath: '/coll',
        workspacePathname: '/workspace',
        environmentPath: '',
        selectedEnvironment: ''
      }
    });
  });

  it('leaves the persisted selection alone when a non-active environment file is removed', () => {
    const dispatch = jest.fn();

    collectionUnlinkEnvFileEventThunk(payload(makeEnvironment()))(dispatch, makeGetState('env-2'));

    expect(dispatch).toHaveBeenCalledWith(collectionUnlinkEnvFileEvent(payload(makeEnvironment())));
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
