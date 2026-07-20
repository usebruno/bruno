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

const {
  findCollectionEnvironmentFromSnapshot
} = require('../../../../utils/snapshot');
const {
  shouldPreserveCollectionEnvironmentInSnapshot,
  serializeSnapshot
} = require('providers/ReduxStore/middlewares/snapshot/serializeSnapshot');
const collectionsReducer = require('providers/ReduxStore/slices/collections').default;
const {
  mountCollection
} = require('providers/ReduxStore/slices/collections/actions');

const COLLECTION_PATH = 'C:/Users/abhis/Documents/Bruno/Dark knight/collections/YamlBased';
const WORKSPACE_PATH = 'C:/Users/abhis/Documents/Bruno/Dark knight';
const ENV_PATH = `${COLLECTION_PATH}/environments/abhi.yml`;
const ENV_UID = 'env-abhi-uid';

const snapshotData = {
  environmentPath: ENV_PATH,
  selectedEnvironment: 'abhi'
};

const makeExistingSnapshot = () => ({
  version: '0.0.1',
  activeWorkspacePath: WORKSPACE_PATH,
  extras: { devTools: { open: false, activeTab: 'terminal', tabs: {} } },
  workspaces: [
    {
      pathname: WORKSPACE_PATH,
      sorting: 'default',
      collections: [COLLECTION_PATH]
    }
  ],
  collections: [
    {
      pathname: COLLECTION_PATH,
      workspacePathname: WORKSPACE_PATH,
      environment: {
        collection: ENV_PATH,
        global: '18b6ltc00000000000000'
      },
      environmentPath: ENV_PATH,
      selectedEnvironment: 'abhi',
      isOpen: true,
      isMounted: true,
      tabs: []
    }
  ]
});

const makeState = (collectionOverrides = {}) => ({
  app: {
    snapshotHydration: {
      pendingCollectionPathnames: []
    }
  },
  workspaces: {
    activeWorkspaceUid: 'ws-dark-knight',
    workspaces: [
      {
        uid: 'ws-dark-knight',
        pathname: WORKSPACE_PATH,
        collections: [{ path: COLLECTION_PATH }]
      }
    ]
  },
  collections: {
    collectionSortOrder: 'default',
    collections: [
      {
        uid: 'col-yamlbased',
        pathname: COLLECTION_PATH,
        mountStatus: 'unmounted',
        environments: [],
        activeEnvironmentUid: null,
        collapsed: false,
        ...collectionOverrides
      }
    ],
    tempDirectories: {}
  },
  tabs: {
    tabs: [],
    activeTabUid: null
  },
  logs: {
    isConsoleOpen: false,
    activeTab: 'terminal'
  },
  globalEnvironments: {
    activeGlobalEnvironmentUid: null
  }
});

const createMountStore = () => configureStore({
  reducer: {
    app: (state = {
      preferences: { cache: { file: { enabled: false } } }
    }) => state,
    collections: collectionsReducer
  },
  preloadedState: {
    app: {
      preferences: { cache: { file: { enabled: false } } }
    },
    collections: {
      collectionSortOrder: 'default',
      collections: [
        {
          uid: 'col-yamlbased',
          pathname: COLLECTION_PATH,
          mountStatus: 'unmounted',
          environments: [{ uid: ENV_UID, name: 'abhi', pathname: ENV_PATH }],
          activeEnvironmentUid: null,
          collapsed: false,
          items: []
        }
      ],
      activeConnections: [],
      tempDirectories: {},
      saveTransientRequestModals: []
    }
  }
});

describe('environment restore race', () => {
  describe('pre-mount hydrate (switchWorkspace step before mount)', () => {
    it('cannot resolve selected environment when environments are not loaded yet', () => {
      const environment = findCollectionEnvironmentFromSnapshot(
        { pathname: COLLECTION_PATH, environments: [] },
        snapshotData
      );
      expect(environment).toBeNull();
    });

    it('resolves selected environment once environments are loaded', () => {
      const environment = findCollectionEnvironmentFromSnapshot(
        {
          pathname: COLLECTION_PATH,
          environments: [{ uid: ENV_UID, name: 'abhi', pathname: ENV_PATH }]
        },
        snapshotData
      );
      expect(environment).toMatchObject({ uid: ENV_UID, name: 'abhi' });
    });
  });

  describe('post-mount serialize after failed restore', () => {
    it('treats mounted+hydrated+null selection as cleared and does not preserve snapshot env', () => {
      expect(shouldPreserveCollectionEnvironmentInSnapshot({
        collection: {
          mountStatus: 'mounted',
          environments: [{ uid: ENV_UID, name: 'abhi', pathname: ENV_PATH }]
        },
        environmentPathFromRedux: '',
        selectedEnvironmentFromRedux: '',
        existingEnvironmentPath: ENV_PATH,
        existingSelectedEnvironment: 'abhi'
      })).toBe(false);
    });

    it('overwrites snapshot selectedEnvironment to empty after the race', async () => {
      const snapshot = await serializeSnapshot(
        makeState({
          mountStatus: 'mounted',
          activeEnvironmentUid: null,
          environments: [{ uid: ENV_UID, name: 'abhi', pathname: ENV_PATH }]
        }),
        { getExistingSnapshot: async () => makeExistingSnapshot() }
      );

      expect(snapshot.collections[0]).toMatchObject({
        pathname: COLLECTION_PATH,
        environmentPath: '',
        selectedEnvironment: ''
      });
    });
  });

  describe('mountCollection skipTabRestore behavior', () => {
    it('skips tab restore but still restores the saved collection environment after mount', async () => {
      const store = createMountStore();
      window.ipcRenderer = {
        invoke: jest.fn((channel) => {
          if (channel === 'renderer:mount-collection') {
            return Promise.resolve('/tmp/bruno-transient');
          }

          if (channel === 'renderer:snapshot:get-collection') {
            return Promise.resolve(snapshotData);
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
});
