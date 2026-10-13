let mockStoreData = {};

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation((opts = {}) => {
    mockStoreData = { ...(opts.defaults || {}) };
    return {
      get store() {
        return mockStoreData;
      },
      set store(value) {
        mockStoreData = value;
      },
      get: (key, fallback) => (key in mockStoreData ? mockStoreData[key] : fallback),
      set: (key, value) => {
        mockStoreData[key] = value;
      },
      delete: (key) => {
        delete mockStoreData[key];
      }
    };
  });
});

const snapshotManager = require('../../src/services/snapshot');

const WS_A = '/tmp/workspace-a';
const WS_B = '/tmp/workspace-b';
const COL_SHARED = '/tmp/collections/shared';

const seedMultiWorkspaceSnapshot = () => {
  snapshotManager.saveSnapshot({
    version: '0.0.1',
    activeWorkspacePath: WS_A,
    extras: {
      devTools: {
        open: false,
        activeTab: 'terminal',
        tabs: { terminal: {}, network: {} }
      },
      sidebar: { width: 200, collapsed: false }
    },
    workspaces: [
      {
        pathname: WS_A,
        environment: '',
        sorting: 'default',
        lastActiveCollectionPathname: COL_SHARED,
        collections: [COL_SHARED]
      },
      {
        pathname: WS_B,
        environment: '',
        sorting: 'alphabetical',
        lastActiveCollectionPathname: COL_SHARED,
        apiSpecTabs: ['/tmp/spec.yaml'],
        collections: [COL_SHARED]
      }
    ],
    collections: [
      {
        pathname: COL_SHARED,
        workspacePathname: WS_A,
        environment: { collection: '/tmp/env-a.yml', global: '' },
        environmentPath: '/tmp/env-a.yml',
        selectedEnvironment: 'a',
        isOpen: true,
        isMounted: true,
        activeTab: { accessor: 'pathname', value: `${COL_SHARED}/a.bru` },
        tabs: [
          {
            type: 'http-request',
            accessor: 'pathname',
            pathname: `${COL_SHARED}/a.bru`,
            permanent: true
          }
        ]
      },
      {
        pathname: COL_SHARED,
        workspacePathname: WS_B,
        environment: { collection: '/tmp/env-b.yml', global: '' },
        environmentPath: '/tmp/env-b.yml',
        selectedEnvironment: 'b',
        isOpen: false,
        isMounted: false,
        activeTab: null,
        tabs: [
          {
            type: 'http-request',
            accessor: 'pathname',
            pathname: `${COL_SHARED}/b.bru`,
            permanent: true
          }
        ]
      }
    ]
  });
};

describe('SnapshotManager.mergeSnapshot', () => {
  beforeEach(() => {
    mockStoreData = {};
    seedMultiWorkspaceSnapshot();
  });

  it('retains inactive workspace rows when patching only the active workspace', async () => {
    const result = await snapshotManager.mergeSnapshot({
      revision: 1,
      activeWorkspacePath: WS_A,
      workspaces: [
        {
          pathname: WS_A,
          environment: '',
          sorting: 'reverseAlphabetical',
          lastActiveCollectionPathname: COL_SHARED,
          collections: [COL_SHARED]
        }
      ],
      collections: [
        {
          pathname: COL_SHARED,
          workspacePathname: WS_A,
          isOpen: true,
          isMounted: true,
          activeTab: { accessor: 'pathname', value: `${COL_SHARED}/a.bru` },
          tabs: [
            {
              type: 'http-request',
              accessor: 'pathname',
              pathname: `${COL_SHARED}/a.bru`,
              permanent: true
            }
          ]
        }
      ]
    });

    expect(result).toMatchObject({
      applied: true,
      changed: true,
      revision: 1,
      snapshot: {
        activeWorkspacePath: WS_A
      }
    });

    const snapshot = snapshotManager.getSnapshot();
    const workspaceB = snapshot.workspaces.find((workspace) => workspace.pathname === WS_B);

    expect(workspaceB).toMatchObject({
      sorting: 'alphabetical',
      apiSpecTabs: ['/tmp/spec.yaml']
    });

    const collectionB = snapshot.collections.find(
      (collection) => collection.workspacePathname === WS_B && collection.pathname === COL_SHARED
    );

    expect(collectionB).toMatchObject({
      selectedEnvironment: 'b',
      tabs: [{ pathname: `${COL_SHARED}/b.bru` }]
    });
  });

  it('preserves collection environment when patch marks fields as unhydrated', async () => {
    await snapshotManager.mergeSnapshot({
      revision: 2,
      workspaces: [
        {
          pathname: WS_A,
          environment: '',
          sorting: 'default',
          collections: [COL_SHARED]
        }
      ],
      collections: [
        {
          pathname: COL_SHARED,
          workspacePathname: WS_A,
          isOpen: true,
          isMounted: false,
          activeTab: null,
          tabs: [],
          environment: { collection: '', global: '' },
          environmentPath: '',
          selectedEnvironment: '',
          preserveEnvironment: true
        }
      ]
    });

    const collectionA = snapshotManager.getCollection(COL_SHARED, WS_A);
    expect(collectionA).toMatchObject({
      environmentPath: '/tmp/env-a.yml',
      selectedEnvironment: 'a',
      environment: {
        collection: '/tmp/env-a.yml',
        global: ''
      }
    });
  });

  it('deep-merges devtools tab state', async () => {
    const result = await snapshotManager.mergeSnapshot({
      revision: 3,
      extras: {
        devTools: {
          open: true,
          activeTab: 'network',
          tabs: { network: {} }
        }
      }
    });

    expect(result).toMatchObject({ applied: true, revision: 3 });
    const snapshot = snapshotManager.getSnapshot();
    expect(snapshot.extras.devTools).toMatchObject({
      open: true,
      activeTab: 'network',
      tabs: {
        terminal: {},
        network: {}
      }
    });
  });

  it('removes workspace-scoped collection rows explicitly', async () => {
    await snapshotManager.mergeSnapshot({
      removeCollections: [{ workspacePathname: WS_B, pathname: COL_SHARED }]
    });

    const snapshot = snapshotManager.getSnapshot();
    expect(
      snapshot.collections.some(
        (collection) => collection.workspacePathname === WS_B && collection.pathname === COL_SHARED
      )
    ).toBe(false);
    expect(
      snapshot.collections.some(
        (collection) => collection.workspacePathname === WS_A && collection.pathname === COL_SHARED
      )
    ).toBe(true);
  });

  describe('environment preserve end-state parity', () => {
    const WS = '/tmp/snapshot-parity-workspace';
    const COL = '/tmp/snapshot-parity-workspace/collections/api';
    const ENV_LOCAL = '/tmp/snapshot-parity-workspace/collections/api/environments/local.yml';
    const ENV_STAGING = '/tmp/snapshot-parity-workspace/collections/api/environments/staging.yml';

    const seedLocalCollection = (existingOverrides = {}) => {
      snapshotManager.saveSnapshot({
        version: '0.0.1',
        activeWorkspacePath: WS,
        extras: {
          devTools: { open: false, activeTab: 'terminal', tabs: { terminal: {} } },
          sidebar: { width: 200, collapsed: false }
        },
        workspaces: [
          {
            pathname: WS,
            environment: '',
            sorting: 'default',
            lastActiveCollectionPathname: COL,
            collections: [COL]
          }
        ],
        collections: [
          {
            pathname: COL,
            workspacePathname: WS,
            environment: { collection: ENV_LOCAL, global: 'old-global' },
            environmentPath: ENV_LOCAL,
            selectedEnvironment: 'local',
            isOpen: false,
            isMounted: false,
            activeTab: null,
            tabs: [],
            ...existingOverrides
          }
        ]
      });
    };

    const unhydratedCollectionPatch = (overrides = {}) => ({
      pathname: COL,
      workspacePathname: WS,
      isOpen: false,
      isMounted: false,
      activeTab: null,
      tabs: [],
      environment: { collection: '', global: overrides.global ?? '' },
      environmentPath: '',
      selectedEnvironment: '',
      preserveEnvironment: true,
      ...overrides
    });

    beforeEach(() => {
      mockStoreData = {};
      seedLocalCollection();
    });

    it('keeps existing collection env for unmounted unhydrated patch (legacy serializeSnapshot outcome)', async () => {
      await snapshotManager.mergeSnapshot({
        collections: [unhydratedCollectionPatch()]
      });

      expect(snapshotManager.getCollection(COL, WS)).toMatchObject({
        environmentPath: ENV_LOCAL,
        selectedEnvironment: 'local',
        environment: { collection: ENV_LOCAL, global: '' }
      });
    });

    it('keeps existing collection env for mounted unhydrated patch', async () => {
      await snapshotManager.mergeSnapshot({
        collections: [
          unhydratedCollectionPatch({
            isOpen: true,
            isMounted: true
          })
        ]
      });

      expect(snapshotManager.getCollection(COL, WS)).toMatchObject({
        environmentPath: ENV_LOCAL,
        selectedEnvironment: 'local'
      });
    });

    it('applies authoritative redux selection when hydrated (staging)', async () => {
      await snapshotManager.mergeSnapshot({
        collections: [
          {
            pathname: COL,
            workspacePathname: WS,
            isOpen: true,
            isMounted: true,
            activeTab: null,
            tabs: [],
            environment: { collection: ENV_STAGING, global: '' },
            environmentPath: ENV_STAGING,
            selectedEnvironment: 'staging'
          }
        ]
      });

      expect(snapshotManager.getCollection(COL, WS)).toMatchObject({
        environmentPath: ENV_STAGING,
        selectedEnvironment: 'staging',
        environment: { collection: ENV_STAGING, global: '' }
      });
    });

    it('clears collection env when hydrated selection was cleared in redux', async () => {
      await snapshotManager.mergeSnapshot({
        collections: [
          {
            pathname: COL,
            workspacePathname: WS,
            isOpen: true,
            isMounted: true,
            activeTab: null,
            tabs: [],
            environment: { collection: '', global: '' },
            environmentPath: '',
            selectedEnvironment: ''
          }
        ]
      });

      expect(snapshotManager.getCollection(COL, WS)).toMatchObject({
        environmentPath: '',
        selectedEnvironment: '',
        environment: { collection: '', global: '' }
      });
    });

    it('updates environment.global while preserving collection env when patch has preserveEnvironment', async () => {
      await snapshotManager.mergeSnapshot({
        collections: [
          unhydratedCollectionPatch({ global: 'new-global-uid' })
        ]
      });

      expect(snapshotManager.getCollection(COL, WS)).toMatchObject({
        environmentPath: ENV_LOCAL,
        selectedEnvironment: 'local',
        environment: {
          collection: ENV_LOCAL,
          global: 'new-global-uid'
        }
      });
    });
  });

  it('ignores stale revisions', async () => {
    await snapshotManager.mergeSnapshot({
      revision: 10,
      activeWorkspacePath: WS_B
    });

    const result = await snapshotManager.mergeSnapshot({
      revision: 9,
      activeWorkspacePath: WS_A
    });

    expect(result).toMatchObject({
      applied: false,
      changed: false,
      revision: 10,
      snapshot: {
        activeWorkspacePath: WS_B
      }
    });
    expect(snapshotManager.getSnapshot().activeWorkspacePath).toBe(WS_B);
  });
});

describe('SnapshotManager.getWorkspaceSnapshot', () => {
  beforeEach(() => {
    mockStoreData = {};
    seedMultiWorkspaceSnapshot();
  });

  it('returns only the requested workspace slice', () => {
    const slice = snapshotManager.getWorkspaceSnapshot(WS_B);

    expect(slice.workspace).toMatchObject({
      pathname: WS_B,
      sorting: 'alphabetical'
    });
    expect(slice.collections).toHaveLength(1);
    expect(slice.collections[0]).toMatchObject({
      workspacePathname: WS_B,
      pathname: COL_SHARED
    });
  });
});
