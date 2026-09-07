const { describe, it, expect, jest } = require('@jest/globals');

jest.mock('nanoid', () => {
  let counter = 0;

  return {
    customAlphabet: jest.fn(() => () => {
      counter += 1;
      return `uuid-${counter}`;
    })
  };
});

const {
  deserializeTab,
  hydrateSnapshotLookups,
  hydrateCollectionTabs,
  isActiveTab,
  getActiveTabFromSnapshot,
  serializeTab,
  serializeActiveTab,
  getCollectionSnapshotFromLookups
} = require('./index');

describe('hydrateSnapshotLookups', () => {
  it('builds lookup maps from array-based snapshot schema', () => {
    const snapshot = {
      workspaces: [
        {
          pathname: '/workspaces/main',
          sorting: 'default',
          collections: ['/collections/a']
        }
      ],
      collections: [
        {
          pathname: '/collections/a',
          environment: {
            collection: '/collections/a/environments/Prod.yml',
            global: 'Global'
          },
          selectedEnvironment: 'Prod',
          isOpen: true,
          isMounted: false,
          activeTab: { accessor: 'type', value: 'variables' },
          tabs: [{ type: 'variables', accessor: 'type', permanent: false }]
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);
    const collection = lookups.collectionsByPath['/collections/a'];
    const workspace = lookups.workspacesByPath['/workspaces/main'];
    const tabs = lookups.tabsByCollectionPath['/collections/a'];

    expect(collection).toMatchObject({
      pathname: '/collections/a',
      workspacePathname: '/workspaces/main',
      environment: {
        collection: '/collections/a/environments/Prod.yml',
        global: 'Global'
      },
      environmentPath: '/collections/a/environments/Prod.yml',
      selectedEnvironment: 'Prod',
      isOpen: true,
      isMounted: false
    });

    expect(workspace).toMatchObject({
      pathname: '/workspaces/main',
      sorting: 'default',
      collections: ['/collections/a']
    });

    expect(tabs).toMatchObject({
      pathname: '/collections/a',
      activeTab: { accessor: 'type', value: 'variables' }
    });
    expect(Array.isArray(tabs.tabs)).toBe(true);
    expect(tabs.tabs).toHaveLength(1);
  });

  it('builds lookup maps from map-based snapshot schema for backward compatibility', () => {
    const snapshot = {
      workspaces: [
        {
          pathname: '/workspaces/main',
          sorting: 'default',
          collections: ['/collections/a']
        }
      ],
      collections: [
        {
          pathname: '/collections/a',
          environmentPath: 'Prod',
          isOpen: true,
          isMounted: true,
          activeTab: { accessor: 'type', value: 'variables' },
          tabs: [{ type: 'variables', accessor: 'type', permanent: false }]
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);
    const collection = lookups.collectionsByPath['/collections/a'];
    const workspace = lookups.workspacesByPath['/workspaces/main'];
    const tabs = lookups.tabsByCollectionPath['/collections/a'];

    expect(collection).toMatchObject({
      pathname: '/collections/a',
      workspacePathname: '/workspaces/main',
      environment: {
        collection: 'Prod',
        global: ''
      },
      environmentPath: 'Prod',
      selectedEnvironment: '',
      isOpen: true,
      isMounted: true
    });

    expect(workspace).toMatchObject({
      pathname: '/workspaces/main',
      sorting: 'default',
      collections: ['/collections/a']
    });

    expect(tabs).toMatchObject({
      pathname: '/collections/a',
      activeTab: { accessor: 'type', value: 'variables' }
    });
    expect(Array.isArray(tabs.tabs)).toBe(true);
    expect(tabs.tabs).toHaveLength(1);

    const windowsSnapshot = {
      workspaces: [
        {
          pathname: 'C:\\workspace',
          sorting: 'default',
          collections: ['C:\\workspace\\collection']
        }
      ],
      collections: [
        {
          pathname: 'C:\\workspace\\collection',
          selectedEnvironment: 'Prod',
          isOpen: true,
          isMounted: true
        }
      ]
    };

    const windowsLookups = hydrateSnapshotLookups(windowsSnapshot);
    expect(windowsLookups.collectionsByPath['C:/workspace/collection']).toMatchObject({
      workspacePathname: 'C:\\workspace',
      selectedEnvironment: 'Prod'
    });
  });

  it('keeps workspace-scoped tab snapshots when same collection exists in multiple workspaces', () => {
    const sharedCollectionPath = '/collections/shared';
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';

    const snapshot = {
      workspaces: [
        {
          pathname: workspaceAPath,
          sorting: 'default',
          collections: [sharedCollectionPath]
        },
        {
          pathname: workspaceBPath,
          sorting: 'default',
          collections: [sharedCollectionPath]
        }
      ],
      collections: [
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceAPath,
          environment: {
            collection: 'env-a',
            global: ''
          },
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: false,
          activeTab: { accessor: 'pathname', value: '/collections/shared/ReqA' },
          tabs: [{ type: 'http-request', accessor: 'pathname', pathname: '/collections/shared/ReqA', permanent: true }]
        },
        {
          pathname: sharedCollectionPath,
          workspacePathname: workspaceBPath,
          environment: {
            collection: 'env-b',
            global: ''
          },
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: false,
          activeTab: { accessor: 'pathname', value: '/collections/shared/ReqB' },
          tabs: [{ type: 'http-request', accessor: 'pathname', pathname: '/collections/shared/ReqB', permanent: true }]
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);
    const keyA = `${workspaceAPath}::${sharedCollectionPath}`;
    const keyB = `${workspaceBPath}::${sharedCollectionPath}`;

    expect(lookups.tabsByWorkspaceAndCollectionPath[keyA]).toMatchObject({
      activeTab: { accessor: 'pathname', value: '/collections/shared/ReqA' },
      tabs: [{ pathname: '/collections/shared/ReqA' }]
    });

    expect(lookups.tabsByWorkspaceAndCollectionPath[keyB]).toMatchObject({
      activeTab: { accessor: 'pathname', value: '/collections/shared/ReqB' },
      tabs: [{ pathname: '/collections/shared/ReqB' }]
    });

    expect(lookups.hasWorkspaceScopedTabs).toBe(true);

    expect(getCollectionSnapshotFromLookups(sharedCollectionPath, lookups, workspaceAPath)).toMatchObject({
      selectedEnvironment: 'env-a'
    });
    expect(getCollectionSnapshotFromLookups(sharedCollectionPath, lookups, workspaceBPath)).toMatchObject({
      selectedEnvironment: 'env-b'
    });
  });

  it('prioritizes active workspace collection data in collectionsByPath when later non-active entries would otherwise overwrite it', () => {
    const collectionPath = '/collections/shared';

    const snapshot = {
      activeWorkspacePath: '/workspaces/active',
      workspaces: [
        {
          pathname: '/workspaces/active',
          sorting: 'default',
          collections: [collectionPath]
        },
        {
          pathname: '/workspaces/other',
          sorting: 'default',
          collections: [collectionPath]
        }
      ],
      collections: [
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/active',
          environment: {
            collection: 'env-active',
            global: ''
          },
          selectedEnvironment: 'env-active',
          isOpen: true,
          isMounted: false
        },
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/other',
          environment: {
            collection: '',
            global: ''
          },
          selectedEnvironment: '',
          isOpen: false,
          isMounted: false
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.collectionsByPath[collectionPath]).toMatchObject({
      selectedEnvironment: 'env-active',
      environment: {
        collection: 'env-active',
        global: ''
      }
    });
  });

  it('keeps workspace-scoped collection lookups distinct when active workspace preference is applied', () => {
    const collectionPath = '/collections/shared';
    const workspaceAPath = '/workspaces/a';
    const workspaceBPath = '/workspaces/b';

    const snapshot = {
      activeWorkspacePath: workspaceAPath,
      workspaces: [
        { pathname: workspaceAPath, sorting: 'default', collections: [collectionPath] },
        { pathname: workspaceBPath, sorting: 'default', collections: [collectionPath] }
      ],
      collections: [
        {
          pathname: collectionPath,
          workspacePathname: workspaceAPath,
          environment: { collection: 'env-a', global: '' },
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: false
        },
        {
          pathname: collectionPath,
          workspacePathname: workspaceBPath,
          environment: { collection: 'env-b', global: '' },
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: false
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.collectionsByPath[collectionPath]).toMatchObject({
      selectedEnvironment: 'env-a'
    });
    expect(getCollectionSnapshotFromLookups(collectionPath, lookups, workspaceAPath)).toMatchObject({
      selectedEnvironment: 'env-a'
    });
    expect(getCollectionSnapshotFromLookups(collectionPath, lookups, workspaceBPath)).toMatchObject({
      selectedEnvironment: 'env-b'
    });
  });

  it('prefers blank active workspace collection data over a later non-active entry with environment data', () => {
    const collectionPath = '/collections/shared';

    const snapshot = {
      activeWorkspacePath: '/workspaces/active',
      workspaces: [
        { pathname: '/workspaces/active', sorting: 'default', collections: [collectionPath] },
        { pathname: '/workspaces/other', sorting: 'default', collections: [collectionPath] }
      ],
      collections: [
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/active',
          environment: { collection: '', global: '' },
          selectedEnvironment: '',
          isOpen: true,
          isMounted: false
        },
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/other',
          environment: { collection: 'env-other', global: '' },
          selectedEnvironment: 'env-other',
          isOpen: false,
          isMounted: false
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.collectionsByPath[collectionPath]).toMatchObject({
      selectedEnvironment: '',
      environment: { collection: '', global: '' }
    });
  });

  it('prefers an active workspace entry with environment data over an earlier blank active entry for the same path', () => {
    const collectionPath = '/collections/shared';
    const activeWorkspacePath = '/workspaces/active';

    const snapshot = {
      activeWorkspacePath,
      workspaces: [
        { pathname: activeWorkspacePath, sorting: 'default', collections: [collectionPath] }
      ],
      collections: [
        {
          pathname: collectionPath,
          workspacePathname: activeWorkspacePath,
          environment: { collection: '', global: '' },
          selectedEnvironment: '',
          isOpen: true,
          isMounted: false
        },
        {
          pathname: collectionPath,
          workspacePathname: activeWorkspacePath,
          environment: { collection: 'env-second', global: '' },
          selectedEnvironment: 'env-second',
          isOpen: true,
          isMounted: false
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.collectionsByPath[collectionPath]).toMatchObject({
      selectedEnvironment: 'env-second',
      environment: { collection: 'env-second', global: '' }
    });
  });

  it('uses last-write-wins for collectionsByPath when activeWorkspacePath is absent', () => {
    const collectionPath = '/collections/shared';

    const snapshot = {
      workspaces: [
        { pathname: '/workspaces/a', sorting: 'default', collections: [collectionPath] },
        { pathname: '/workspaces/b', sorting: 'default', collections: [collectionPath] }
      ],
      collections: [
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/a',
          environment: { collection: 'env-a', global: '' },
          selectedEnvironment: 'env-a',
          isOpen: true,
          isMounted: false
        },
        {
          pathname: collectionPath,
          workspacePathname: '/workspaces/b',
          environment: { collection: 'env-b', global: '' },
          selectedEnvironment: 'env-b',
          isOpen: true,
          isMounted: false
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.collectionsByPath[collectionPath]).toMatchObject({
      selectedEnvironment: 'env-b',
      environment: { collection: 'env-b', global: '' }
    });
  });

  it('drops legacy v4 migration tabs from snapshot lookups', () => {
    const snapshot = {
      collections: [
        {
          pathname: '/collections/legacy',
          activeTab: { accessor: 'type', value: 'v4-migration' },
          tabs: [
            { type: 'v4-migration', accessor: 'type', permanent: true },
            { type: 'variables', accessor: 'type', permanent: true }
          ]
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.tabsByCollectionPath['/collections/legacy'].tabs).toEqual([
      { type: 'variables', accessor: 'type', permanent: true }
    ]);
  });

  it('drops changelog tabs from snapshot lookups', () => {
    const snapshot = {
      collections: [
        {
          pathname: '/collections/a',
          activeTab: { accessor: 'type', value: 'changelog' },
          tabs: [
            { type: 'changelog', accessor: 'pathname', permanent: true },
            { type: 'variables', accessor: 'type', permanent: true }
          ]
        }
      ]
    };

    const lookups = hydrateSnapshotLookups(snapshot);

    expect(lookups.tabsByCollectionPath['/collections/a'].tabs).toEqual([
      { type: 'variables', accessor: 'type', permanent: true }
    ]);
  });
});

describe('deserializeTab', () => {
  const collection = {
    uid: 'collection-uid',
    pathname: '/collections/a'
  };

  it('restores collection-settings tab uid from collection uid', () => {
    const snapshotTab = {
      type: 'collection-settings',
      accessor: 'type',
      permanent: true,
      collection: 'collection-from-snapshot'
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.uid).toBe('collection-from-snapshot');
  });

  it('generates unique uid for non-replaceable singleton type tabs', () => {
    const snapshotTab = {
      type: 'variables',
      accessor: 'type',
      permanent: false
    };

    const firstTab = deserializeTab(snapshotTab, collection);
    const secondTab = deserializeTab(snapshotTab, collection);

    expect(firstTab.uid).not.toBe('variables');
    expect(secondTab.uid).not.toBe('variables');
    expect(firstTab.uid).not.toBe(secondTab.uid);
  });

  it('restores mock-server tab with stable uid from mockServerUid', () => {
    const snapshotTab = {
      type: 'mock-server',
      accessor: 'type::mockServerUid',
      mockServerUid: 'mock-server-1',
      name: 'My Mock Server',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);

    expect(tab.type).toBe('mock-server');
    expect(tab.uid).toBe('mock-server-1');
    expect(tab.mockServerUid).toBe('mock-server-1');
    expect(tab.tabName).toBe('My Mock Server');
    expect(tab.preview).toBe(false);
  });

  it('migrates legacy mocker snapshots to mock-server', () => {
    const snapshotTab = {
      type: 'mocker',
      accessor: 'type::mockServerUid',
      mockServerUid: 'mock-server-1',
      name: 'My Mock Server',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);

    expect(tab.type).toBe('mock-server');
    expect(tab.uid).toBe('mock-server-1');
    expect(tab.mockServerUid).toBe('mock-server-1');
    expect(tab.tabName).toBe('My Mock Server');
  });

  it('migrates legacy mock-server-dashboard snapshots to mock-server', () => {
    const snapshotTab = {
      type: 'mock-server-dashboard',
      accessor: 'type',
      mockServerUid: 'mock-server-legacy',
      permanent: false
    };

    const tab = deserializeTab(snapshotTab, collection);

    expect(tab.type).toBe('mock-server');
    expect(tab.uid).toBe('mock-server-legacy');
  });

  it('generates uid when mock-server snapshot has no mockServerUid', () => {
    const snapshotTab = {
      type: 'mock-server',
      accessor: 'type',
      permanent: false
    };

    const tab = deserializeTab(snapshotTab, collection);

    expect(tab.type).toBe('mock-server');
    expect(tab.uid).toBeTruthy();
    expect(tab.uid).not.toBe('mock-server');
  });

  it('restores preferences uid scoped to collection uid', () => {
    const snapshotTab = {
      type: 'preferences',
      accessor: 'type',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.uid).toBe('collection-uid-preferences');
  });

  it('restores global environment settings uid scoped to collection uid', () => {
    const snapshotTab = {
      type: 'global-environment-settings',
      accessor: 'type',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.uid).toBe('collection-uid-global-environment-settings');
  });

  it('falls back to type-based uid restore for collection-scoped singleton tabs missing pathname', () => {
    const snapshotTab = {
      type: 'preferences',
      accessor: 'pathname',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.uid).toBe('collection-uid-preferences');
  });

  it('defaults folder settings request pane tab to headers', () => {
    const snapshotTab = {
      type: 'folder-settings',
      accessor: 'pathname',
      pathname: '/collections/a/folder',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.requestPaneTab).toBe('headers');
  });

  it('restores folder settings request pane tab from snapshot', () => {
    const snapshotTab = {
      type: 'folder-settings',
      accessor: 'pathname',
      pathname: '/collections/a/folder',
      request: { tab: 'auth' },
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.requestPaneTab).toBe('auth');
  });

  it('keeps folder-settings type when pathname resolves to a non-request item', () => {
    const collectionWithFolderItem = {
      ...collection,
      items: [
        {
          uid: 'folder-1',
          pathname: '/collections/a/folder',
          type: 'folder'
        }
      ]
    };

    const snapshotTab = {
      type: 'folder-settings',
      accessor: 'pathname',
      pathname: '/collections/a/folder',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithFolderItem);
    expect(tab.type).toBe('folder-settings');
    expect(tab.folderUid).toBe('folder-1');
    expect(tab.requestPaneTab).toBe('headers');
  });

  it('restores response example by index when duplicate names exist', () => {
    const collectionWithDuplicateExamples = {
      uid: 'collection-uid',
      pathname: '/collections/a',
      items: [
        {
          uid: 'request-1',
          pathname: '/collections/a/request-1.bru',
          examples: [
            { uid: 'example-1', name: 'dup' },
            { uid: 'example-2', name: 'dup' }
          ]
        }
      ]
    };

    const snapshotTab = {
      type: 'response-example',
      accessor: 'pathname::exampleIndex',
      pathname: '/collections/a/request-1.bru',
      exampleName: 'dup',
      exampleIndex: 1,
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithDuplicateExamples);
    expect(tab.uid).toBe('example-2');
    expect(tab.exampleName).toBe('dup');
    expect(tab.exampleIndex).toBe(1);
  });

  it('falls back to first matching name when example index is missing or invalid', () => {
    const collectionWithDuplicateExamples = {
      uid: 'collection-uid',
      pathname: '/collections/a',
      items: [
        {
          uid: 'request-1',
          pathname: '/collections/a/request-1.bru',
          examples: [
            { uid: 'example-1', name: 'dup' },
            { uid: 'example-2', name: 'dup' }
          ]
        }
      ]
    };

    const snapshotTab = {
      type: 'response-example',
      accessor: 'pathname::exampleIndex',
      pathname: '/collections/a/request-1.bru',
      exampleName: 'dup',
      exampleIndex: 99,
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithDuplicateExamples);
    expect(tab.uid).toBe('example-1');
    expect(tab.exampleName).toBe('dup');
    expect(tab.exampleIndex).toBe(0);
  });

  it('keeps example uid and index consistent when uid fallback is used', () => {
    const collectionWithDuplicateExamples = {
      uid: 'collection-uid',
      pathname: '/collections/a',
      items: [
        {
          uid: 'request-1',
          pathname: '/collections/a/request-1.bru',
          examples: [
            { uid: 'example-1', name: 'dup' },
            { uid: 'example-2', name: 'dup' }
          ]
        }
      ]
    };

    const snapshotTab = {
      type: 'response-example',
      accessor: 'pathname::exampleIndex',
      pathname: '/collections/a/request-1.bru',
      exampleName: 'dup',
      exampleUid: 'example-1',
      exampleIndex: 99,
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithDuplicateExamples);
    expect(tab.uid).toBe('example-1');
    expect(tab.exampleName).toBe('dup');
    expect(tab.exampleIndex).toBe(0);
  });

  it('defaults grpc request pane to body when snapshot request tab is missing', () => {
    const snapshotTab = {
      type: 'grpc-request',
      accessor: 'pathname',
      pathname: '/collections/a/grpc-request.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.requestPaneTab).toBe('body');
  });

  it('defaults websocket request pane to body when snapshot request tab is missing', () => {
    const snapshotTab = {
      type: 'ws-request',
      accessor: 'pathname',
      pathname: '/collections/a/ws-request.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.requestPaneTab).toBe('body');
  });

  it('resolves generic request snapshot type to item type using pathname', () => {
    const collectionWithGrpcItem = {
      ...collection,
      items: [
        {
          uid: 'grpc-item-1',
          pathname: '/collections/a/grpc-item.bru',
          type: 'grpc-request'
        }
      ]
    };
    const snapshotTab = {
      type: 'request',
      accessor: 'pathname',
      pathname: '/collections/a/grpc-item.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithGrpcItem);
    expect(tab.type).toBe('grpc-request');
    expect(tab.requestPaneTab).toBe('body');
  });

  it('defaults to body for resolved websocket item type when generic snapshot request tab is missing', () => {
    const collectionWithWsItem = {
      ...collection,
      items: [
        {
          uid: 'ws-item-1',
          pathname: '/collections/a/ws-item.bru',
          type: 'ws-request'
        }
      ]
    };

    const snapshotTab = {
      type: 'request',
      accessor: 'pathname',
      pathname: '/collections/a/ws-item.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithWsItem);
    expect(tab.type).toBe('ws-request');
    expect(tab.requestPaneTab).toBe('body');
  });

  it('defaults graphql request pane to query when snapshot request tab is missing', () => {
    const snapshotTab = {
      type: 'graphql-request',
      accessor: 'pathname',
      pathname: '/collections/a/graphql-request.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collection);
    expect(tab.requestPaneTab).toBe('query');
  });

  it('resolves generic request snapshot type to graphql-request item type using pathname', () => {
    const collectionWithGraphqlItem = {
      ...collection,
      items: [
        {
          uid: 'graphql-item-1',
          pathname: '/collections/a/graphql-item.bru',
          type: 'graphql-request'
        }
      ]
    };

    const snapshotTab = {
      type: 'request',
      accessor: 'pathname',
      pathname: '/collections/a/graphql-item.bru',
      permanent: true
    };

    const tab = deserializeTab(snapshotTab, collectionWithGraphqlItem);
    expect(tab.type).toBe('graphql-request');
    expect(tab.requestPaneTab).toBe('query');
  });
});

describe('active tab matching', () => {
  const collection = {
    uid: 'collection-uid',
    pathname: '/collections/a'
  };

  it('matches mock-server tabs by mockServerUid', () => {
    const tab = {
      uid: 'mock-server-1',
      type: 'mock-server',
      mockServerUid: 'mock-server-1'
    };

    expect(isActiveTab(tab, { accessor: 'type::mockServerUid', value: 'mock-server-1' }, collection)).toBe(true);
    expect(isActiveTab(tab, { accessor: 'type::mockServerUid', value: 'mock-server-2' }, collection)).toBe(false);
  });

  it('serializes and restores mock-server active tab by mockServerUid', () => {
    const tab = {
      uid: 'mock-server-1',
      type: 'mock-server',
      mockServerUid: 'mock-server-1',
      tabName: 'My Mock Server',
      preview: false
    };

    const serialized = serializeTab(tab, collection);
    expect(serialized.type).toBe('mock-server');
    expect(serialized.accessor).toBe('type::mockServerUid');
    expect(serialized.mockServerUid).toBe('mock-server-1');
    expect(serialized.name).toBe('My Mock Server');

    const activeTab = serializeActiveTab(tab, collection);
    expect(activeTab).toEqual({ accessor: 'type::mockServerUid', value: 'mock-server-1' });
  });

  it('does not mark response example tab as active for pathname accessor', () => {
    const collection = {
      uid: 'collection-uid',
      pathname: '/collections/a',
      items: [
        {
          uid: 'request-1',
          pathname: '/collections/a/request-1.bru',
          examples: [{ uid: 'example-1', name: 'Sample' }]
        }
      ]
    };

    const tab = {
      uid: 'example-1',
      type: 'response-example',
      itemUid: 'request-1',
      pathname: '/collections/a/request-1.bru',
      exampleName: 'Sample'
    };

    const activeTab = {
      accessor: 'pathname',
      value: '/collections/a/request-1.bru'
    };

    expect(isActiveTab(tab, activeTab, collection)).toBe(false);
  });

  it('matches mock-response tabs by response uid', () => {
    const tab = {
      uid: 'mock-response-1',
      type: 'mock-response',
      mockServerUid: 'mock-server-1',
      responseName: 'Premium'
    };

    expect(isActiveTab(tab, { accessor: 'type::mockResponseUid', value: 'mock-response-1' }, collection)).toBe(true);
    expect(isActiveTab(tab, { accessor: 'type::mockResponseUid', value: 'mock-response-2' }, collection)).toBe(false);
  });

  it('serializes and restores mock-response tabs by response uid', () => {
    const tab = {
      uid: 'mock-response-1',
      type: 'mock-response',
      mockServerUid: 'mock-server-1',
      responseName: 'Premium',
      tabName: 'Premium',
      preview: false
    };

    const serialized = serializeTab(tab, collection);
    expect(serialized.type).toBe('mock-response');
    expect(serialized.accessor).toBe('type::mockResponseUid');
    expect(serialized.mockServerUid).toBe('mock-server-1');
    expect(serialized.responseUid).toBe('mock-response-1');
    expect(serialized.name).toBe('Premium');

    const activeTab = serializeActiveTab(tab, collection);
    expect(activeTab).toEqual({ accessor: 'type::mockResponseUid', value: 'mock-response-1' });

    const restored = deserializeTab(serialized, collection);
    expect(restored.type).toBe('mock-response');
    expect(restored.uid).toBe('mock-response-1');
    expect(restored.mockServerUid).toBe('mock-server-1');
    expect(restored.responseName).toBe('Premium');
  });
});

describe('getActiveTabFromSnapshot', () => {
  beforeEach(() => {
    global.window = global.window || {};
    global.window.ipcRenderer = {
      invoke: jest.fn()
    };
  });

  afterEach(() => {
    delete global.window.ipcRenderer;
  });

  it('resolves response example using index accessor when duplicate names exist', async () => {
    const collection = {
      uid: 'collection-uid',
      pathname: '/collections/a',
      items: [
        {
          uid: 'request-1',
          pathname: '/collections/a/request-1.bru',
          examples: [
            { uid: 'example-1', name: 'dup' },
            { uid: 'example-2', name: 'dup' }
          ]
        }
      ]
    };

    window.ipcRenderer.invoke.mockResolvedValue({
      activeTab: {
        accessor: 'pathname::exampleIndex',
        value: '/collections/a/request-1.bru::1'
      },
      tabs: [
        {
          type: 'response-example',
          accessor: 'pathname::exampleIndex',
          pathname: '/collections/a/request-1.bru',
          exampleName: 'dup',
          exampleIndex: 0,
          permanent: true
        },
        {
          type: 'response-example',
          accessor: 'pathname::exampleIndex',
          pathname: '/collections/a/request-1.bru',
          exampleName: 'dup',
          exampleIndex: 1,
          permanent: true
        }
      ]
    });

    const activeTab = await getActiveTabFromSnapshot('/collections/a', collection, null, null);
    expect(activeTab.uid).toBe('example-2');
    expect(activeTab.exampleIndex).toBe(1);
  });
});

describe('hydrateCollectionTabs', () => {
  beforeEach(() => {
    global.window = {
      ipcRenderer: {
        invoke: jest.fn().mockResolvedValue(null)
      }
    };
  });

  afterEach(() => {
    delete global.window;
  });

  it('does not restore tabs when snapshot has no tab state', async () => {
    const snapshot = {
      collections: [
        {
          pathname: '/collections/legacy',
          selectedEnvironment: 'local'
        }
      ]
    };
    const lookups = hydrateSnapshotLookups(snapshot);
    const dispatch = jest.fn();
    const restoreTabs = jest.fn();

    await hydrateCollectionTabs(
      { uid: 'collection-uid', pathname: '/collections/legacy' },
      dispatch,
      restoreTabs,
      lookups,
      null,
      true
    );

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('restores empty tab state for shared collection workspace isolation', async () => {
    const snapshot = {
      workspaces: [
        {
          pathname: '/workspaces/a',
          collections: ['/collections/shared']
        },
        {
          pathname: '/workspaces/b',
          collections: ['/collections/shared']
        }
      ],
      collections: [
        {
          pathname: '/collections/shared',
          workspacePathname: '/workspaces/a',
          tabs: [
            {
              type: 'http-request',
              accessor: 'pathname',
              pathname: '/collections/shared/request-a.bru',
              permanent: true
            }
          ],
          activeTab: {
            accessor: 'pathname',
            value: '/collections/shared/request-a.bru'
          }
        },
        {
          pathname: '/collections/shared',
          workspacePathname: '/workspaces/b',
          tabs: [],
          activeTab: null
        }
      ]
    };
    const lookups = hydrateSnapshotLookups(snapshot);
    const dispatch = jest.fn();
    const restoreTabs = jest.fn((payload) => ({
      type: 'tabs/restoreTabs',
      payload
    }));

    await hydrateCollectionTabs(
      { uid: 'collection-uid', pathname: '/collections/shared' },
      dispatch,
      restoreTabs,
      lookups,
      '/workspaces/b',
      true
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(restoreTabs).toHaveBeenCalledWith(expect.objectContaining({
      tabs: [],
      activeTab: null
    }));
  });

  it('restores tabs when snapshot has persisted tabs', async () => {
    const snapshot = {
      collections: [
        {
          pathname: '/collections/legacy',
          selectedEnvironment: 'local',
          tabs: [
            {
              type: 'http-request',
              accessor: 'pathname',
              pathname: '/collections/legacy/request.bru',
              permanent: true
            }
          ],
          activeTab: {
            accessor: 'pathname',
            value: '/collections/legacy/request.bru'
          }
        }
      ]
    };
    const lookups = hydrateSnapshotLookups(snapshot);
    const dispatch = jest.fn();
    const restoreTabs = jest.fn((payload) => ({
      type: 'tabs/restoreTabs',
      payload
    }));

    await hydrateCollectionTabs(
      { uid: 'collection-uid', pathname: '/collections/legacy' },
      dispatch,
      restoreTabs,
      lookups,
      null,
      true
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(restoreTabs).toHaveBeenCalledTimes(1);
  });

  it('does not restore legacy v4 migration tabs from direct tab snapshots', async () => {
    global.window.ipcRenderer.invoke.mockResolvedValue({
      tabs: [
        { type: 'v4-migration', accessor: 'type', permanent: true },
        { type: 'variables', accessor: 'type', permanent: true }
      ],
      activeTab: {
        accessor: 'type',
        value: 'v4-migration'
      }
    });

    const dispatch = jest.fn();
    const restoreTabs = jest.fn((payload) => ({
      type: 'tabs/restoreTabs',
      payload
    }));

    await hydrateCollectionTabs(
      { uid: 'collection-uid', pathname: '/collections/legacy' },
      dispatch,
      restoreTabs,
      null,
      null,
      true
    );

    expect(restoreTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: [{ type: 'variables', accessor: 'type', permanent: true }],
        activeTab: null
      })
    );
  });

  it('does not restore changelog tabs from direct tab snapshots', async () => {
    global.window.ipcRenderer.invoke.mockResolvedValue({
      tabs: [
        { type: 'changelog', accessor: 'pathname', permanent: true },
        { type: 'variables', accessor: 'type', permanent: true }
      ],
      activeTab: {
        accessor: 'type',
        value: 'changelog'
      }
    });

    const dispatch = jest.fn();
    const restoreTabs = jest.fn((payload) => ({
      type: 'tabs/restoreTabs',
      payload
    }));

    await hydrateCollectionTabs(
      { uid: 'collection-uid', pathname: '/collections/a' },
      dispatch,
      restoreTabs,
      null,
      null,
      true
    );

    expect(restoreTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: [{ type: 'variables', accessor: 'type', permanent: true }],
        activeTab: null
      })
    );
  });
});

describe('getActiveTabFromSnapshot', () => {
  beforeEach(() => {
    global.window = {
      ipcRenderer: {
        invoke: jest.fn().mockResolvedValue(null)
      }
    };
  });

  afterEach(() => {
    delete global.window;
  });

  it('ignores a legacy v4 migration active tab snapshot', async () => {
    const snapshot = {
      collections: [
        {
          pathname: '/collections/legacy',
          tabs: [
            { type: 'v4-migration', accessor: 'type', permanent: true }
          ],
          activeTab: {
            accessor: 'type',
            value: 'v4-migration'
          }
        }
      ]
    };
    const lookups = hydrateSnapshotLookups(snapshot);

    const activeTab = await getActiveTabFromSnapshot(
      '/collections/legacy',
      { uid: 'collection-uid', pathname: '/collections/legacy' },
      lookups
    );

    expect(activeTab).toBeNull();
  });
});
