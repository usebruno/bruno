const { describe, it, expect } = require('@jest/globals');

import { hydrateSnapshotLookups } from './index';

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
