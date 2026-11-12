import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('@usebruno/schema', () => ({}));
jest.mock('react-hot-toast', () => ({}));

import collectionsReducer, { removeCollection as _removeCollection } from './index';
import tabsReducer, { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { mountCollection, openCollectionSettings, openCollectionSettingsTab, migrateCollectionToYml } from './actions';
import { hydrateCollectionTabs } from 'utils/snapshot';
import { restoreCollectionTabs } from 'providers/ReduxStore/slices/mock-server/actions';

const tmpBase = os.tmpdir();
const col1Path = path.join(tmpBase, 'col-1');
const req1Path = path.join(col1Path, 'req-1.bru');
const transientPath = path.join(tmpBase, 'transient');

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = async (cycles = 10) => {
  for (let i = 0; i < cycles; i += 1) {
    await Promise.resolve();
  }
};

const createTestStore = (mountStatus = 'unmounted') => {
  const initialCollectionsState = collectionsReducer(undefined, { type: '@@INIT' });
  return configureStore({
    reducer: {
      collections: collectionsReducer,
      tabs: tabsReducer,
      app: (state = {
        preferences: {
          cache: { file: { enabled: false } },
          beta: {}
        }
      }) => state,
      workspaces: (state = {
        activeWorkspaceUid: null,
        workspaces: []
      }) => state,
      collectionMigration: (state = {
        status: 'idle'
      }) => state
    },
    preloadedState: {
      collections: {
        ...initialCollectionsState,
        collections: [
          {
            uid: 'col-1',
            pathname: col1Path,
            brunoConfig: { name: 'Col 1' },
            mountStatus,
            collapsed: true,
            items: [
              {
                uid: 'req-1',
                pathname: req1Path,
                type: 'http-request',
                name: 'Request 1'
              }
            ]
          }
        ]
      }
    }
  });
};

describe('mountCollection and collection Settings tab coordination', () => {
  let originalWindow;
  let invokeMock;

  beforeEach(() => {
    originalWindow = global.window;
    invokeMock = jest.fn(() => Promise.resolve(null));
    global.window = {
      ipcRenderer: {
        invoke: invokeMock
      }
    };
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('keeps collection Settings tab open when requested while mount and tab restoration are in flight', async () => {
    const store = createTestStore('unmounted');
    const mountDeferred = createDeferred();
    const getTabsDeferred = createDeferred();

    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:mount-collection') {
        return mountDeferred.promise;
      }
      if (channel === 'renderer:snapshot:get-tabs') {
        return getTabsDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const mountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    }));

    const duplicateMountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    }));

    const openSettingsPromise = store.dispatch(openCollectionSettingsTab('col-1'));

    const mountCalls = invokeMock.mock.calls.filter(([ch]) => ch === 'renderer:mount-collection');
    expect(mountCalls).toHaveLength(1);
    expect(store.getState().collections.collections[0].mountStatus).toBe('mounting');

    mountDeferred.resolve(transientPath);
    await flushMicrotasks();

    getTabsDeferred.resolve({
      tabs: [{ type: 'http-request', pathname: req1Path, permanent: true }],
      activeTab: { accessor: 'pathname', value: req1Path }
    });

    await Promise.all([mountPromise, duplicateMountPromise, openSettingsPromise]);

    const { tabs, activeTabUid } = store.getState().tabs;
    expect(tabs.some((tab) => tab.type === 'collection-settings' && tab.collectionUid === 'col-1')).toBe(true);
    expect(activeTabUid).toBe('col-1');
  });

  it('waits for direct hydrateCollectionTabs before adding the collection Settings tab', async () => {
    const store = createTestStore('mounted');
    const getTabsDeferred = createDeferred();

    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:snapshot:get-tabs') {
        return getTabsDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const collection = store.getState().collections.collections[0];
    const hydratePromise = hydrateCollectionTabs(
      collection,
      store.dispatch,
      restoreCollectionTabs
    );
    await flushMicrotasks();

    const openPromise = store.dispatch(openCollectionSettings('col-1', 'headers'));

    getTabsDeferred.resolve({
      tabs: [{ type: 'http-request', pathname: req1Path, permanent: true }],
      activeTab: { accessor: 'pathname', value: req1Path }
    });

    await Promise.all([hydratePromise, openPromise]);

    const { tabs, activeTabUid } = store.getState().tabs;
    expect(tabs.some((tab) => tab.type === 'collection-settings' && tab.collectionUid === 'col-1')).toBe(true);
    expect(activeTabUid).toBe('col-1');
  });

  it('still opens the collection Settings tab when an in-flight mount fails', async () => {
    const store = createTestStore('unmounted');
    const mountDeferred = createDeferred();

    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:mount-collection') {
        return mountDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const mountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    })).catch(() => {});

    const openPromise = store.dispatch(openCollectionSettingsTab('col-1'));

    mountDeferred.reject(new Error('mount failed'));
    await Promise.all([mountPromise, openPromise]);

    expect(store.getState().collections.collections[0].mountStatus).toBe('unmounted');
    const { tabs, activeTabUid } = store.getState().tabs;
    expect(tabs.some((tab) => tab.type === 'collection-settings' && tab.collectionUid === 'col-1')).toBe(true);
    expect(activeTabUid).toBe('col-1');
  });

  it('cancels pending collection Settings tab if collection is removed while mount is in flight', async () => {
    const store = createTestStore('unmounted');
    const mountDeferred = createDeferred();

    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:mount-collection') {
        return mountDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const mountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    })).catch(() => {});

    const openPromise = store.dispatch(openCollectionSettingsTab('col-1'));

    // User removes collection while mount/settings tab is pending
    store.dispatch(_removeCollection({ collectionUid: 'col-1' }));

    mountDeferred.resolve(transientPath);
    await Promise.all([mountPromise, openPromise]);

    const { tabs } = store.getState().tabs;
    expect(tabs.some((tab) => tab.type === 'collection-settings' && tab.collectionUid === 'col-1')).toBe(false);
  });

  it('cancels pending collection Settings tab if user navigates to another tab while waiting', async () => {
    const store = createTestStore('unmounted');
    const mountDeferred = createDeferred();
    const getTabsDeferred = createDeferred();

    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:mount-collection') {
        return mountDeferred.promise;
      }
      if (channel === 'renderer:snapshot:get-tabs') {
        return getTabsDeferred.promise;
      }
      return Promise.resolve(null);
    });

    const mountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    }));

    const openPromise = store.dispatch(openCollectionSettingsTab('col-1'));

    // User explicitly navigates to a new tab while waiting
    store.dispatch(addTab({ uid: 'other-tab', type: 'request', pathname: '/tmp/other' }));

    mountDeferred.resolve(transientPath);
    await flushMicrotasks();

    getTabsDeferred.resolve({
      tabs: [{ type: 'http-request', pathname: req1Path, permanent: true }],
      activeTab: null
    });

    await Promise.all([mountPromise, openPromise]);

    const { tabs } = store.getState().tabs;
    // Settings tab should not have opened because navigation version changed
    expect(tabs.some((tab) => tab.type === 'collection-settings' && tab.collectionUid === 'col-1')).toBe(false);
  });

  it('ensures migrateCollectionToYml starts a fresh mount instead of reusing stale in-flight mount', async () => {
    const store = createTestStore('unmounted');
    const staleMountDeferred = createDeferred();
    const freshMountDeferred = createDeferred();

    let mountCallCount = 0;
    invokeMock.mockImplementation((channel) => {
      if (channel === 'renderer:mount-collection') {
        mountCallCount += 1;
        if (mountCallCount === 1) {
          return staleMountDeferred.promise;
        }
        return freshMountDeferred.promise;
      }
      if (channel === 'renderer:snapshot:get-tabs') {
        return Promise.resolve({ tabs: [], activeTab: null });
      }
      if (channel === 'renderer:migrate-collection-to-yml') {
        // Simulate main process reopening the collection back into the store
        store.dispatch({
          type: 'collections/createCollection',
          payload: {
            uid: 'col-1',
            pathname: col1Path,
            brunoConfig: { name: 'Col 1' },
            mountStatus: 'unmounted',
            collapsed: true,
            items: []
          }
        });
        return Promise.resolve();
      }
      return Promise.resolve(null);
    });

    // Start a mount that remains in flight
    const staleMountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: col1Path,
      brunoConfig: { name: 'Col 1' }
    })).catch(() => {});

    // Now migration starts and removes/remounts the collection
    const migratePromise = store.dispatch(migrateCollectionToYml('col-1'));

    // Stale mount resolves after migration already invalidated it
    staleMountDeferred.resolve(transientPath);
    freshMountDeferred.resolve(transientPath);

    await Promise.all([staleMountPromise, migratePromise]);

    // Fresh mount was initiated (mountCallCount >= 2)
    expect(mountCallCount).toBe(2);
  });
});
