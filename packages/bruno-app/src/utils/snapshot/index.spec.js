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

const { deserializeTab, hydrateSnapshotLookups } = require('./index');

describe('hydrateSnapshotLookups', () => {
  it('builds lookup maps from array-based snapshot schema', () => {
    const snapshot = {
      workspaces: [
        {
          pathname: '/workspaces/main',
          sorting: 'az',
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
      sorting: 'az',
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
          sorting: 'az',
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
      sorting: 'az',
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
          sorting: 'az',
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
});
