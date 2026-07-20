const { describe, it, expect } = require('@jest/globals');
const { configureStore } = require('@reduxjs/toolkit');

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const { mountCollection } = require('providers/ReduxStore/slices/collections/actions');

const COLLECTION_PATH = 'C:/Users/abhis/Documents/Bruno/Dark knight/collections/YamlBased';
const WORKSPACE_PATH = 'C:/Users/abhis/Documents/Bruno/Dark knight';
const ENV_PATH = `${COLLECTION_PATH}/environments/abhi.yml`;
const ENV_UID = 'env-abhi-uid';

describe('mountCollection skipTabRestore behavior', () => {
  it('skips tab restore but still restores the saved collection environment after mount', async () => {
    const store = configureStore({
      reducer: {
        app: (state = { preferences: { cache: { file: { enabled: false } } } }) => state,
        collections: collectionsReducer
      },
      preloadedState: {
        app: { preferences: { cache: { file: { enabled: false } } } },
        collections: {
          collectionSortOrder: 'default',
          collections: [{
            uid: 'col-yamlbased',
            pathname: COLLECTION_PATH,
            mountStatus: 'unmounted',
            environments: [{ uid: ENV_UID, name: 'abhi', pathname: ENV_PATH }],
            activeEnvironmentUid: null,
            collapsed: false,
            items: []
          }],
          tempDirectories: {}
        }
      }
    });

    window.ipcRenderer = {
      invoke: jest.fn((channel) => {
        if (channel === 'renderer:mount-collection') {
          return Promise.resolve('/tmp/bruno-transient');
        }

        if (channel === 'renderer:snapshot:get-collection') {
          return Promise.resolve({ environmentPath: ENV_PATH, selectedEnvironment: 'abhi' });
        }

        if (channel === 'renderer:snapshot:get-tabs') {
          return Promise.resolve({ tabs: [{ uid: 'tab-1' }], activeTab: { accessor: 'uid', value: 'tab-1' } });
        }

        return Promise.resolve(null);
      })
    };

    await store.dispatch(mountCollection({
      collectionUid: 'col-yamlbased',
      collectionPathname: COLLECTION_PATH,
      brunoConfig: {},
      skipTabRestore: true,
      workspacePathname: WORKSPACE_PATH
    }));

    expect(store.getState().collections.collections[0]).toMatchObject({
      mountStatus: 'mounted',
      activeEnvironmentUid: ENV_UID
    });
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:snapshot:get-collection',
      COLLECTION_PATH,
      WORKSPACE_PATH
    );
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalledWith(
      'renderer:snapshot:get-tabs',
      expect.anything(),
      expect.anything()
    );
  });
});
