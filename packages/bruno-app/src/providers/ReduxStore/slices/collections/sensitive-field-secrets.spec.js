jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

import { configureStore } from '@reduxjs/toolkit';
import collectionsReducer from 'providers/ReduxStore/slices/collections';
import globalEnvironmentsReducer from 'providers/ReduxStore/slices/global-environments';
import {
  addSecretToEnvironment,
  markEnvironmentVariableAsSecret,
  removeVariableFromScope
} from 'providers/ReduxStore/slices/collections/actions';

const COLLECTION_UID = 'col-1';
const ENV_UID = 'env-1';
const GLOBAL_ENV_UID = 'genv-1';

const makeVar = (name, value, overrides = {}) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  enabled: true,
  secret: false,
  ...overrides
});

const createStore = ({ envVars = [], environmentsDraft = null, globalVars = [], globalDraft = null, items = [], activeEnvironmentUid = ENV_UID } = {}) => {
  const workspaces = { activeWorkspaceUid: 'ws-1', workspaces: [{ uid: 'ws-1', pathname: '/workspace' }] };
  return configureStore({
    reducer: {
      collections: collectionsReducer,
      globalEnvironments: globalEnvironmentsReducer,
      workspaces: (state = workspaces) => state
    },
    preloadedState: {
      collections: {
        collectionSortOrder: 'default',
        collections: [{
          uid: COLLECTION_UID,
          pathname: '/collections/col-1',
          activeEnvironmentUid,
          environments: [{ uid: ENV_UID, name: 'Dev', variables: envVars }],
          environmentsDraft,
          root: { request: { vars: { req: [makeVar('collectionToken', 'c1')], res: [] } } },
          collapsed: false,
          items
        }],
        tempDirectories: {}
      },
      globalEnvironments: {
        globalEnvironments: [{ uid: GLOBAL_ENV_UID, name: 'Shared', variables: globalVars, color: null }],
        activeGlobalEnvironmentUid: GLOBAL_ENV_UID,
        globalEnvironmentDraft: globalDraft
      },
      workspaces
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false })
  });
};

const getCollection = (store) => store.getState().collections.collections[0];
const getEnvironment = (store) => getCollection(store).environments[0];
const getGlobalEnvironment = (store) => store.getState().globalEnvironments.globalEnvironments[0];

let invoke;
beforeEach(() => {
  invoke = jest.fn().mockResolvedValue(true);
  window.ipcRenderer = { invoke };
});

describe('addSecretToEnvironment', () => {
  it('appends the secret to the active collection environment', async () => {
    const store = createStore({ envVars: [makeVar('host', 'localhost')] });

    await store.dispatch(addSecretToEnvironment({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      name: 'apiToken',
      value: 'abc123'
    }));

    expect(getEnvironment(store).variables).toEqual([
      makeVar('host', 'localhost'),
      expect.objectContaining({ name: 'apiToken', value: 'abc123', secret: true, enabled: true })
    ]);
  });

  it('saves the unsaved draft rows with the secret and clears the draft', async () => {
    const store = createStore({
      envVars: [makeVar('host', 'localhost')],
      environmentsDraft: { environmentUid: ENV_UID, variables: [makeVar('host', 'edited-host')] }
    });

    await store.dispatch(addSecretToEnvironment({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      name: 'apiToken',
      value: 'abc123'
    }));

    expect(getEnvironment(store).variables.map((variable) => [variable.name, variable.value])).toEqual([
      ['host', 'edited-host'],
      ['apiToken', 'abc123']
    ]);
    expect(getCollection(store).environmentsDraft).toBeNull();
  });

  it('rejects a name that already exists in the environment', async () => {
    const store = createStore({ envVars: [makeVar('apiToken', 'old')] });

    await expect(store.dispatch(addSecretToEnvironment({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      name: 'apiToken',
      value: 'abc123'
    }))).rejects.toThrow('"apiToken" already exists in Dev');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects when the collection has no active environment', async () => {
    const store = createStore({ activeEnvironmentUid: null });

    await expect(store.dispatch(addSecretToEnvironment({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      name: 'apiToken',
      value: 'abc123'
    }))).rejects.toThrow('No environment selected');
  });

  it('appends the secret to the active global environment and clears its draft', async () => {
    const store = createStore({
      globalVars: [makeVar('region', 'us')],
      globalDraft: { environmentUid: GLOBAL_ENV_UID, variables: [makeVar('region', 'eu')] }
    });

    await store.dispatch(addSecretToEnvironment({
      collectionUid: COLLECTION_UID,
      environmentScope: 'global',
      name: 'apiToken',
      value: 'abc123'
    }));

    expect(getGlobalEnvironment(store).variables.map((variable) => [variable.name, variable.value, variable.secret])).toEqual([
      ['region', 'eu', false],
      ['apiToken', 'abc123', true]
    ]);
    expect(store.getState().globalEnvironments.globalEnvironmentDraft).toBeNull();
  });
});

describe('markEnvironmentVariableAsSecret', () => {
  it('marks only the given row as secret and keeps its value', async () => {
    const store = createStore({ envVars: [makeVar('host', 'localhost'), makeVar('token', 'abc')] });

    await store.dispatch(markEnvironmentVariableAsSecret({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      environmentUid: ENV_UID,
      variableUid: 'uid-token'
    }));

    expect(getEnvironment(store).variables).toEqual([
      makeVar('host', 'localhost'),
      makeVar('token', 'abc', { secret: true })
    ]);
  });

  it('saves the unsaved draft edits with the secret and clears the draft', async () => {
    const store = createStore({
      envVars: [makeVar('host', 'localhost'), makeVar('token', 'abc')],
      environmentsDraft: { environmentUid: ENV_UID, variables: [makeVar('host', 'edited-host'), makeVar('token', 'abc')] }
    });

    await store.dispatch(markEnvironmentVariableAsSecret({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      environmentUid: ENV_UID,
      variableUid: 'uid-token'
    }));

    expect(getEnvironment(store).variables).toEqual([
      makeVar('host', 'edited-host'),
      makeVar('token', 'abc', { secret: true })
    ]);
    expect(getCollection(store).environmentsDraft).toBeNull();
  });

  it('rejects when the row is not in the environment', async () => {
    const store = createStore({ envVars: [makeVar('host', 'localhost')] });

    await expect(store.dispatch(markEnvironmentVariableAsSecret({
      collectionUid: COLLECTION_UID,
      environmentScope: 'environment',
      environmentUid: ENV_UID,
      variableUid: 'uid-missing'
    }))).rejects.toThrow('Variable not found');
  });
});

describe('removeVariableFromScope', () => {
  it('removes a collection variable and saves the collection', async () => {
    const store = createStore();

    await store.dispatch(removeVariableFromScope({
      collectionUid: COLLECTION_UID,
      scope: 'collection',
      variableUid: 'uid-collectionToken'
    }));

    expect(getCollection(store).root.request.vars.req).toEqual([]);
    expect(invoke).toHaveBeenCalledWith('renderer:save-collection-root', expect.anything(), expect.anything(), undefined);
  });
});
