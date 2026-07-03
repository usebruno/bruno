const { describe, it, expect } = require('@jest/globals');
const {
  serializeSnapshot,
  shouldPreserveCollectionEnvironmentInSnapshot
} = require('providers/ReduxStore/middlewares/snapshot/serializeSnapshot');

const WORKSPACE_PATH = '/tmp/workspace';
const COLLECTION_PATH = '/tmp/workspace/collections/api';
const ENVIRONMENT_PATH = '/tmp/workspace/collections/api/environments/local.yml';

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
      sourceWorkspacePathname: WORKSPACE_PATH,
      environment: {
        collection: ENVIRONMENT_PATH,
        global: ''
      },
      environmentPath: ENVIRONMENT_PATH,
      selectedEnvironment: 'local',
      isOpen: false,
      isMounted: false,
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
    activeWorkspaceUid: 'ws-1',
    workspaces: [
      {
        uid: 'ws-1',
        pathname: WORKSPACE_PATH,
        collections: [{ path: COLLECTION_PATH }]
      }
    ]
  },
  collections: {
    collectionSortOrder: 'default',
    collections: [
      {
        uid: 'col-1',
        pathname: COLLECTION_PATH,
        mountStatus: 'unmounted',
        environments: [],
        activeEnvironmentUid: null,
        collapsed: true,
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

describe('shouldPreserveCollectionEnvironmentInSnapshot', () => {
  it('preserves when collection is unmounted and redux has no environment selection', () => {
    expect(shouldPreserveCollectionEnvironmentInSnapshot({
      collection: { mountStatus: 'unmounted', environments: [] },
      environmentPathFromRedux: '',
      selectedEnvironmentFromRedux: '',
      existingEnvironmentPath: ENVIRONMENT_PATH,
      existingSelectedEnvironment: 'local'
    })).toBe(true);
  });

  it('does not preserve when redux has an authoritative environment selection', () => {
    expect(shouldPreserveCollectionEnvironmentInSnapshot({
      collection: { mountStatus: 'unmounted', environments: [] },
      environmentPathFromRedux: ENVIRONMENT_PATH,
      selectedEnvironmentFromRedux: 'local',
      existingEnvironmentPath: ENVIRONMENT_PATH,
      existingSelectedEnvironment: 'local'
    })).toBe(false);
  });

  it('preserves when mounted collection has not hydrated environments yet', () => {
    expect(shouldPreserveCollectionEnvironmentInSnapshot({
      collection: { mountStatus: 'mounted', environments: [] },
      environmentPathFromRedux: '',
      selectedEnvironmentFromRedux: '',
      existingEnvironmentPath: ENVIRONMENT_PATH,
      existingSelectedEnvironment: 'local'
    })).toBe(true);
  });

  it('does not preserve when mounted collection is hydrated and selection was cleared', () => {
    expect(shouldPreserveCollectionEnvironmentInSnapshot({
      collection: {
        mountStatus: 'mounted',
        environments: [{ uid: 'env-1', name: 'local', pathname: ENVIRONMENT_PATH }]
      },
      environmentPathFromRedux: '',
      selectedEnvironmentFromRedux: '',
      existingEnvironmentPath: ENVIRONMENT_PATH,
      existingSelectedEnvironment: 'local'
    })).toBe(false);
  });
});

describe('serializeSnapshot collection environment preservation', () => {
  it('creates a safe first-run snapshot when no existing snapshot is available', async () => {
    const snapshot = await serializeSnapshot(makeState(), {
      getExistingSnapshot: async () => null
    });

    expect(snapshot).toMatchObject({
      extras: {
        devTools: {
          open: false,
          activeTab: 'terminal',
          tabs: {
            terminal: {}
          }
        }
      }
    });
  });

  it('preserves existing environment fields for an unmounted collection without loaded environments', async () => {
    const snapshot = await serializeSnapshot(makeState(), {
      getExistingSnapshot: async () => makeExistingSnapshot()
    });

    expect(snapshot.collections).toHaveLength(1);
    expect(snapshot.collections[0]).toMatchObject({
      pathname: COLLECTION_PATH,
      workspacePathname: WORKSPACE_PATH,
      sourceWorkspacePathname: WORKSPACE_PATH,
      environmentPath: ENVIRONMENT_PATH,
      selectedEnvironment: 'local',
      environment: {
        collection: ENVIRONMENT_PATH,
        global: ''
      }
    });
  });

  it('preserves existing environment fields for a mounted but unhydrated collection', async () => {
    const snapshot = await serializeSnapshot(
      makeState({ mountStatus: 'mounted', environments: [], activeEnvironmentUid: null }),
      { getExistingSnapshot: async () => makeExistingSnapshot() }
    );

    expect(snapshot.collections[0]).toMatchObject({
      sourceWorkspacePathname: WORKSPACE_PATH,
      environmentPath: ENVIRONMENT_PATH,
      selectedEnvironment: 'local'
    });
  });

  it('writes redux environment selection when mounted collection is hydrated', async () => {
    const snapshot = await serializeSnapshot(
      makeState({
        mountStatus: 'mounted',
        activeEnvironmentUid: 'env-2',
        environments: [
          {
            uid: 'env-2',
            name: 'staging',
            pathname: '/tmp/workspace/collections/api/environments/staging.yml'
          }
        ]
      }),
      { getExistingSnapshot: async () => makeExistingSnapshot() }
    );

    expect(snapshot.collections[0]).toMatchObject({
      sourceWorkspacePathname: WORKSPACE_PATH,
      environmentPath: '/tmp/workspace/collections/api/environments/staging.yml',
      selectedEnvironment: 'staging'
    });
  });

  it('writes empty environment when mounted hydrated collection selection was cleared', async () => {
    const snapshot = await serializeSnapshot(
      makeState({
        mountStatus: 'mounted',
        activeEnvironmentUid: null,
        environments: [
          {
            uid: 'env-1',
            name: 'local',
            pathname: ENVIRONMENT_PATH
          }
        ]
      }),
      { getExistingSnapshot: async () => makeExistingSnapshot() }
    );

    expect(snapshot.collections[0]).toMatchObject({
      sourceWorkspacePathname: WORKSPACE_PATH,
      environmentPath: '',
      selectedEnvironment: ''
    });
  });
});
