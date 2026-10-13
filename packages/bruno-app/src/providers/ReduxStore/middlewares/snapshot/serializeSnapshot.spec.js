const { describe, it, expect } = require('@jest/globals');
const {
  buildSnapshotDelta,
  shouldPreserveCollectionEnvironmentInSnapshot
} = require('providers/ReduxStore/middlewares/snapshot/serializeSnapshot');

jest.mock('providers/ReduxStore/middlewares/snapshot/snapshotRevision', () => ({
  getNextSnapshotRevision: jest.fn(() => 1)
}));

const WORKSPACE_PATH = '/tmp/workspace';
const COLLECTION_PATH = '/tmp/workspace/collections/api';
const ENVIRONMENT_PATH = '/tmp/workspace/collections/api/environments/local.yml';

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

describe('buildSnapshotDelta workspace tab restoration', () => {
  it('records the active workspace tab type when the scratch collection tab is focused', async () => {
    const scratchCollectionUid = 'scratch-1';
    const state = makeState();
    state.workspaces.workspaces[0].scratchCollectionUid = scratchCollectionUid;
    state.tabs.tabs = [{ uid: `${scratchCollectionUid}-environments`, collectionUid: scratchCollectionUid, type: 'workspaceEnvironments' }];
    state.tabs.activeTabUid = `${scratchCollectionUid}-environments`;

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0]).toMatchObject({
      activeWorkspaceTabType: 'workspaceEnvironments'
    });
  });

  it('does not record an active workspace tab type when a non-workspace tab is focused', async () => {
    const scratchCollectionUid = 'scratch-1';
    const state = makeState();
    state.workspaces.workspaces[0].scratchCollectionUid = scratchCollectionUid;
    state.tabs.tabs = [{ uid: 'req-1', collectionUid: COLLECTION_PATH, type: 'http-request' }];
    state.tabs.activeTabUid = 'req-1';

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0]).toMatchObject({
      activeWorkspaceTabType: null
    });
  });
});

describe('buildSnapshotDelta API spec tabs', () => {
  const PETSTORE_PATH = '/tmp/workspace/petstore.yaml';
  const ORDERS_PATH = '/tmp/workspace/orders.yaml';

  const makeStateWithApiSpecTabs = () => {
    const scratchCollectionUid = 'scratch-1';
    const state = makeState();
    state.workspaces.workspaces[0].scratchCollectionUid = scratchCollectionUid;
    state.tabs.tabs = [
      { uid: `${scratchCollectionUid}-overview`, collectionUid: scratchCollectionUid, type: 'workspaceOverview' },
      { uid: 'api-spec::' + PETSTORE_PATH, collectionUid: scratchCollectionUid, type: 'api-spec', apiSpecPathname: PETSTORE_PATH },
      { uid: 'api-spec::' + ORDERS_PATH, collectionUid: scratchCollectionUid, type: 'api-spec', apiSpecPathname: ORDERS_PATH }
    ];
    return state;
  };

  it('remembers every open spec tab, so they all come back after a restart', async () => {
    const state = makeStateWithApiSpecTabs();

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0].apiSpecTabs).toEqual([PETSTORE_PATH, ORDERS_PATH]);
  });

  it('remembers which spec tab was active', async () => {
    const state = makeStateWithApiSpecTabs();
    state.tabs.activeTabUid = 'api-spec::' + ORDERS_PATH;

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0].activeApiSpecTabPathname).toBe(ORDERS_PATH);
  });

  it('records no active spec tab when the user is looking at something else', async () => {
    const state = makeStateWithApiSpecTabs();
    state.tabs.activeTabUid = 'scratch-1-overview';

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0].activeApiSpecTabPathname).toBeNull();
  });

  it('records no spec tabs for a workspace that has none open', async () => {
    const state = makeState();
    state.workspaces.workspaces[0].scratchCollectionUid = 'scratch-1';

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.workspaces[0].apiSpecTabs).toEqual([]);
  });
});

describe('buildSnapshotDelta collection environment', () => {
  it('reuses the persisted snapshot as a baseline and emits only changed sections', () => {
    const state = makeState();
    const firstPatch = buildSnapshotDelta(state);

    const unchangedPatch = buildSnapshotDelta(state, firstPatch);
    expect(unchangedPatch).toEqual({ revision: 1 });

    state.collections.collectionSortOrder = 'alphabetical';
    const changedPatch = buildSnapshotDelta(state, firstPatch);

    expect(changedPatch).toMatchObject({
      revision: 1,
      workspaces: [{
        pathname: WORKSPACE_PATH,
        sorting: 'alphabetical'
      }]
    });
    expect(changedPatch.collections).toBeUndefined();
  });

  it('creates a safe first-run patch when no existing snapshot is available', () => {
    const snapshot = buildSnapshotDelta(makeState());

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

  it('patch contract: unmounted unhydrated collection sends empty collection env and preserveEnvironment', () => {
    const snapshot = buildSnapshotDelta(makeState());

    expect(snapshot.collections).toHaveLength(1);
    expect(snapshot.collections[0]).toMatchObject({
      pathname: COLLECTION_PATH,
      workspacePathname: WORKSPACE_PATH,
      environment: {
        collection: '',
        global: ''
      },
      environmentPath: '',
      selectedEnvironment: '',
      preserveEnvironment: true
    });
  });

  it('patch contract: mounted unhydrated collection sends empty collection env and preserveEnvironment', () => {
    const snapshot = buildSnapshotDelta(
      makeState({ mountStatus: 'mounted', environments: [], activeEnvironmentUid: null })
    );

    expect(snapshot.collections[0]).toMatchObject({
      environment: {
        collection: '',
        global: ''
      },
      environmentPath: '',
      selectedEnvironment: '',
      preserveEnvironment: true
    });
  });

  it('patch contract: mounted hydrated collection sends authoritative redux environment selection', () => {
    const snapshot = buildSnapshotDelta(
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
      })
    );

    expect(snapshot.collections[0]).toMatchObject({
      environmentPath: '/tmp/workspace/collections/api/environments/staging.yml',
      selectedEnvironment: 'staging'
    });
  });

  it('patch contract: mounted hydrated cleared selection sends empty environment without preserveEnvironment', () => {
    const snapshot = buildSnapshotDelta(
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
      })
    );

    expect(snapshot.collections[0]).toMatchObject({
      environmentPath: '',
      selectedEnvironment: ''
    });
    expect(snapshot.collections[0].preserveEnvironment).toBeUndefined();
  });

  it('patch contract: preserveEnvironment still sends active global environment uid from redux', () => {
    const state = makeState();
    state.globalEnvironments.activeGlobalEnvironmentUid = 'global-env-1';

    const snapshot = buildSnapshotDelta(state);

    expect(snapshot.collections[0]).toMatchObject({
      preserveEnvironment: true,
      environment: {
        collection: '',
        global: 'global-env-1'
      }
    });
  });
});
