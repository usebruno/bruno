import { buildAddToScopes, buildScopeInfo, createEnvironmentForScope, resolveFolderScopeTarget } from './index';
import { getAvailableAddToScopes } from 'utils/collections';
import { addEnvironment, selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';

jest.mock('utils/collections', () => ({
  findCollectionByUid: (collections, uid) => (collections || []).find((collection) => collection.uid === uid),
  findParentItemInCollection: jest.fn(),
  getAvailableAddToScopes: jest.fn(() => [])
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  addEnvironment: jest.fn(),
  selectEnvironment: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/global-environments', () => ({
  addGlobalEnvironment: jest.fn()
}));

const { findParentItemInCollection } = require('utils/collections');

const environment = { uid: 'env-1', name: 'Dev', variables: [{ uid: 'v1', name: 'baseUrl', enabled: true }] };
const collection = { uid: 'col-1', environments: [environment], activeEnvironmentUid: 'env-1' };
const item = { uid: 'item-1', type: 'http-request' };

const state = {
  collections: { collections: [collection] },
  globalEnvironments: { globalEnvironments: [], activeGlobalEnvironmentUid: null }
};

beforeEach(() => {
  jest.clearAllMocks();
  getAvailableAddToScopes.mockReturnValue([]);
});

describe('resolveFolderScopeTarget', () => {
  it('targets the folder itself when the item is a folder', () => {
    const folder = { uid: 'folder-1', type: 'folder' };

    expect(resolveFolderScopeTarget(collection, folder)).toEqual({ folderScopeTarget: folder, isSelfFolder: true });
    expect(findParentItemInCollection).not.toHaveBeenCalled();
  });

  it('targets the containing folder for a request', () => {
    const parent = { uid: 'folder-9', type: 'folder' };
    findParentItemInCollection.mockReturnValue(parent);

    expect(resolveFolderScopeTarget(collection, item)).toEqual({ folderScopeTarget: parent, isSelfFolder: false });
  });

  it('has no folder target without a collection', () => {
    expect(resolveFolderScopeTarget(null, item)).toEqual({ folderScopeTarget: null, isSelfFolder: false });
  });
});

describe('buildAddToScopes', () => {
  it('passes the active environment through when it has a name', () => {
    buildAddToScopes({ state, collection, item });

    expect(getAvailableAddToScopes).toHaveBeenCalledWith(
      expect.objectContaining({
        activeEnvironmentUid: 'env-1',
        activeEnvironmentName: 'Dev',
        hasCollection: true,
        isSelfFolder: false
      })
    );
  });

  it('leaves the active environment uid undefined when no environment resolves', () => {
    const withoutEnvironment = { ...collection, environments: [], activeEnvironmentUid: 'env-gone' };

    buildAddToScopes({ state: { ...state, collections: { collections: [withoutEnvironment] } }, collection: withoutEnvironment, item });

    expect(getAvailableAddToScopes).toHaveBeenCalledWith(
      expect.objectContaining({ activeEnvironmentUid: undefined, activeEnvironmentName: undefined })
    );
  });

  it('reports hasCollection false when there is no collection', () => {
    buildAddToScopes({ state, collection: null, item: null });

    expect(getAvailableAddToScopes).toHaveBeenCalledWith(expect.objectContaining({ hasCollection: false }));
  });
});

describe('buildScopeInfo', () => {
  it('builds the collection scope', () => {
    expect(buildScopeInfo({ scopeType: 'collection', state, collection, item })).toEqual({
      type: 'collection',
      value: '',
      data: { collection, variable: null }
    });
  });

  it('builds the request scope', () => {
    expect(buildScopeInfo({ scopeType: 'request', state, collection, item })).toEqual({
      type: 'request',
      value: '',
      data: { item, variable: null }
    });
  });

  it('builds the folder scope against the containing folder', () => {
    const parent = { uid: 'folder-9', type: 'folder' };
    findParentItemInCollection.mockReturnValue(parent);

    expect(buildScopeInfo({ scopeType: 'folder', state, collection, item })).toEqual({
      type: 'folder',
      value: '',
      data: { folder: parent, variable: null }
    });
  });

  it('resolves the environment scope against the live active environment', () => {
    expect(buildScopeInfo({ scopeType: 'environment', state, collection, item, secret: true })).toEqual({
      type: 'environment',
      value: '',
      data: { environment, variable: null, secret: true }
    });
  });

  it('defaults secret to false', () => {
    expect(buildScopeInfo({ scopeType: 'environment', state, collection, item }).data.secret).toBe(false);
  });

  it('resolves the global scope against the active global environment', () => {
    const globalEnvironment = { uid: 'genv-1', name: 'Shared' };
    const globalState = {
      ...state,
      globalEnvironments: { globalEnvironments: [globalEnvironment], activeGlobalEnvironmentUid: 'genv-1' }
    };

    expect(buildScopeInfo({ scopeType: 'global', state: globalState, collection, item })).toEqual({
      type: 'global',
      value: '',
      data: { environment: globalEnvironment, variable: null, secret: false }
    });
  });

  it('returns null for an unknown scope', () => {
    expect(buildScopeInfo({ scopeType: 'runtime', state, collection, item })).toBeNull();
  });
});

describe('createEnvironmentForScope', () => {
  const createStore = (storeState) => ({
    getState: () => storeState,
    dispatch: jest.fn(() => Promise.resolve()),
    subscribe: jest.fn(() => jest.fn())
  });

  it('rejects a name the main process would rewrite, rather than reporting a false failure later', async () => {
    const store = createStore(state);

    await expect(
      createEnvironmentForScope({ scope: { type: 'environment', label: 'Collection Environment' }, name: 'Prod:Env', collectionUid: 'col-1', store })
    ).rejects.toThrow();
    expect(addEnvironment).not.toHaveBeenCalled();
  });

  it('rejects a collection environment name differing only in case', async () => {
    const store = createStore(state);

    await expect(
      createEnvironmentForScope({ scope: { type: 'environment', label: 'Collection Environment' }, name: 'dev', collectionUid: 'col-1', store })
    ).rejects.toThrow('Environment already exists');
    expect(addEnvironment).not.toHaveBeenCalled();
  });

  it('rejects a global environment name differing only in case', async () => {
    const store = createStore({
      ...state,
      globalEnvironments: { globalEnvironments: [{ uid: 'genv-1', name: 'Shared' }], activeGlobalEnvironmentUid: null }
    });

    await expect(
      createEnvironmentForScope({ scope: { type: 'global', label: 'Global Environment' }, name: 'SHARED', collectionUid: 'col-1', store })
    ).rejects.toThrow('Environment already exists');
    expect(addGlobalEnvironment).not.toHaveBeenCalled();
  });

  it('creates a global environment', async () => {
    const store = createStore(state);

    await createEnvironmentForScope({ scope: { type: 'global', label: 'Global Environment' }, name: 'Shared', collectionUid: 'col-1', store });

    expect(addGlobalEnvironment).toHaveBeenCalledWith({ name: 'Shared', variables: [] });
  });

  it('creates a collection environment then selects it once the watcher reports it', async () => {
    const before = { collections: { collections: [{ uid: 'col-1', environments: [], activeEnvironmentUid: null }] } };
    const after = {
      collections: { collections: [{ uid: 'col-1', environments: [{ uid: 'env-9', name: 'Staging' }], activeEnvironmentUid: null }] }
    };
    const getState = jest.fn().mockReturnValueOnce(before).mockReturnValue(after);
    const store = { getState, dispatch: jest.fn(() => Promise.resolve()), subscribe: jest.fn(() => jest.fn()) };

    await createEnvironmentForScope({ scope: { type: 'environment', label: 'Collection Environment' }, name: 'Staging', collectionUid: 'col-1', store });

    expect(addEnvironment).toHaveBeenCalledWith('Staging', 'col-1');
    expect(selectEnvironment).toHaveBeenCalledWith('env-9', 'col-1');
  });

  it('rejects scopes that cannot be created', async () => {
    const store = createStore(state);

    await expect(
      createEnvironmentForScope({ scope: { type: 'collection', label: 'Collection Variable' }, name: 'Nope', collectionUid: 'col-1', store })
    ).rejects.toThrow('does not support creating a new one');
  });
});
