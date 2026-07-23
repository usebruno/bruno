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

const collectionPath = '/collections/my-collection';

const seedSnapshot = () => {
  snapshotManager.saveSnapshot({
    version: '0.0.1',
    activeWorkspacePath: null,
    extras: { devTools: { open: false, activeTab: '', tabs: {} } },
    workspaces: [],
    collections: [
      {
        pathname: collectionPath,
        workspacePathname: '',
        environment: { collection: '', global: '' },
        isOpen: true,
        isMounted: true,
        activeTab: { accessor: 'pathname', value: `${collectionPath}/ping.bru` },
        tabs: [
          { type: 'http-request', accessor: 'pathname', pathname: `${collectionPath}/ping.bru`, permanent: true },
          { type: 'http-request', accessor: 'pathname', pathname: `${collectionPath}/api/get-users.bru`, permanent: true },
          {
            type: 'response-example',
            accessor: 'pathname::exampleName',
            pathname: `${collectionPath}/ping.bru`,
            exampleName: 'success',
            permanent: true
          },
          { type: 'collection-settings', accessor: 'type', permanent: true }
        ]
      }
    ]
  });
};

describe('SnapshotManager.remapCollectionTabPaths', () => {
  beforeEach(() => {
    mockStoreData = {};
    seedSnapshot();
  });

  it('remaps .bru request tab pathnames to their .yml equivalents', () => {
    snapshotManager.remapCollectionTabPaths(collectionPath, {
      [`${collectionPath}/ping.bru`]: `${collectionPath}/ping.yml`,
      [`${collectionPath}/api/get-users.bru`]: `${collectionPath}/api/get-users.yml`
    });

    const { tabs } = snapshotManager.getTabs(collectionPath);
    const pathnames = tabs.filter((t) => t.pathname).map((t) => t.pathname);

    expect(pathnames).toContain(`${collectionPath}/ping.yml`);
    expect(pathnames).toContain(`${collectionPath}/api/get-users.yml`);
    expect(pathnames.some((p) => p.endsWith('.bru'))).toBe(false);
  });

  it('remaps the active tab value', () => {
    snapshotManager.remapCollectionTabPaths(collectionPath, {
      [`${collectionPath}/ping.bru`]: `${collectionPath}/ping.yml`
    });

    const { activeTab } = snapshotManager.getTabs(collectionPath);
    expect(activeTab).toEqual({ accessor: 'pathname', value: `${collectionPath}/ping.yml` });
  });

  it('remaps the pathname prefix of example tabs while preserving the example suffix', () => {
    snapshotManager.remapCollectionTabPaths(collectionPath, {
      [`${collectionPath}/ping.bru`]: `${collectionPath}/ping.yml`
    });

    const { tabs } = snapshotManager.getTabs(collectionPath);
    const exampleTab = tabs.find((t) => t.type === 'response-example');
    expect(exampleTab.pathname).toBe(`${collectionPath}/ping.yml`);
    expect(exampleTab.exampleName).toBe('success');
  });

  it('leaves non-request tabs and unmapped pathnames untouched', () => {
    snapshotManager.remapCollectionTabPaths(collectionPath, {
      [`${collectionPath}/ping.bru`]: `${collectionPath}/ping.yml`
    });

    const { tabs } = snapshotManager.getTabs(collectionPath);
    expect(tabs.find((t) => t.type === 'collection-settings')).toBeTruthy();
    expect(tabs.some((t) => t.pathname === `${collectionPath}/api/get-users.bru`)).toBe(true);
  });

  it('is a no-op when the path map is empty', () => {
    snapshotManager.remapCollectionTabPaths(collectionPath, {});

    const { tabs } = snapshotManager.getTabs(collectionPath);
    expect(tabs.some((t) => t.pathname === `${collectionPath}/ping.bru`)).toBe(true);
  });
});

describe('SnapshotManager shared collection lookups', () => {
  beforeEach(() => {
    mockStoreData = {};
  });

  it('uses active workspace collection environment when a later shared collection entry is blank', () => {
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';
    const sharedCollectionPath = '/collections/shared';

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspaceAPath,
      extras: { devTools: { open: false, activeTab: '', tabs: {} } },
      workspaces: [
        {
          pathname: workspaceAPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        },
        {
          pathname: workspaceBPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: 'env-a', global: '' },
          environmentPath: 'env-a',
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceBPath,
          environment: { collection: '', global: '' },
          environmentPath: '',
          selectedEnvironment: '',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        }
      ]
    });

    expect(snapshotManager.getCollection(sharedCollectionPath)).toMatchObject({
      workspacePathname: workspaceAPath,
      environment: { collection: 'env-a', global: '' },
      environmentPath: 'env-a',
      selectedEnvironment: 'env-a'
    });
  });

  it('keeps workspace-scoped getCollection results distinct when active workspace preference is applied', () => {
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';
    const sharedCollectionPath = '/collections/shared';

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspaceAPath,
      extras: { devTools: { open: false, activeTab: '', tabs: {} } },
      workspaces: [
        {
          pathname: workspaceAPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        },
        {
          pathname: workspaceBPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: 'env-a', global: '' },
          environmentPath: 'env-a',
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceBPath,
          environment: { collection: 'env-b', global: '' },
          environmentPath: 'env-b',
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        }
      ]
    });

    expect(snapshotManager.getCollection(sharedCollectionPath)).toMatchObject({
      selectedEnvironment: 'env-a'
    });
    expect(snapshotManager.getCollection(sharedCollectionPath, workspaceAPath)).toMatchObject({
      selectedEnvironment: 'env-a'
    });
    expect(snapshotManager.getCollection(sharedCollectionPath, workspaceBPath)).toMatchObject({
      selectedEnvironment: 'env-b'
    });
  });

  it('prefers blank active workspace collection data over a later non-active entry with environment data', () => {
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';
    const sharedCollectionPath = '/collections/shared';

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspaceAPath,
      extras: { devTools: { open: false, activeTab: '', tabs: {} } },
      workspaces: [
        {
          pathname: workspaceAPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        },
        {
          pathname: workspaceBPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: '', global: '' },
          environmentPath: '',
          selectedEnvironment: '',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceBPath,
          environment: { collection: 'env-b', global: '' },
          environmentPath: 'env-b',
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        }
      ]
    });

    expect(snapshotManager.getCollection(sharedCollectionPath)).toMatchObject({
      workspacePathname: workspaceAPath,
      selectedEnvironment: '',
      environment: { collection: '', global: '' }
    });
  });

  it('prefers an active workspace entry with environment data over an earlier blank active entry for the same path', () => {
    const workspaceAPath = '/workspaces/a';
    const sharedCollectionPath = '/collections/shared';

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: workspaceAPath,
      extras: { devTools: { open: false, activeTab: '', tabs: {} } },
      workspaces: [
        {
          pathname: workspaceAPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: '', global: '' },
          environmentPath: '',
          selectedEnvironment: '',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: 'env-second', global: '' },
          environmentPath: 'env-second',
          selectedEnvironment: 'env-second',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        }
      ]
    });

    expect(snapshotManager.getCollection(sharedCollectionPath)).toMatchObject({
      selectedEnvironment: 'env-second',
      environment: { collection: 'env-second', global: '' }
    });
  });

  it('uses last-write-wins for path lookup when activeWorkspacePath is absent', () => {
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';
    const sharedCollectionPath = '/collections/shared';

    snapshotManager.saveSnapshot({
      version: '0.0.1',
      activeWorkspacePath: null,
      extras: { devTools: { open: false, activeTab: '', tabs: {} } },
      workspaces: [
        {
          pathname: workspaceAPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        },
        {
          pathname: workspaceBPath,
          environment: '',
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: 'env-a', global: '' },
          environmentPath: 'env-a',
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceBPath,
          environment: { collection: 'env-b', global: '' },
          environmentPath: 'env-b',
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: true,
          activeTab: null,
          tabs: []
        }
      ]
    });

    expect(snapshotManager.getCollection(sharedCollectionPath)).toMatchObject({
      workspacePathname: workspaceBPath,
      selectedEnvironment: 'env-b',
      environment: { collection: 'env-b', global: '' }
    });
  });
});
