import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('@usebruno/schema', () => ({}));
jest.mock('react-hot-toast', () => ({}));

import collectionsReducer from './index';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import { mountCollection, openCollectionSettings, openCollectionSettingsTab } from './actions';
import { hydrateCollectionTabs } from 'utils/snapshot';
import { restoreCollectionTabs } from 'providers/ReduxStore/slices/mock-server/actions';

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
      }) => state
    },
    preloadedState: {
      collections: {
        collections: [
          {
            uid: 'col-1',
            pathname: '/tmp/col-1',
            brunoConfig: { name: 'Col 1' },
            mountStatus,
            collapsed: true,
            items: [
              {
                uid: 'req-1',
                pathname: '/tmp/col-1/req-1.bru',
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
      collectionPathname: '/tmp/col-1',
      brunoConfig: { name: 'Col 1' }
    }));

    const duplicateMountPromise = store.dispatch(mountCollection({
      collectionUid: 'col-1',
      collectionPathname: '/tmp/col-1',
      brunoConfig: { name: 'Col 1' }
    }));

    const openSettingsPromise = store.dispatch(openCollectionSettingsTab('col-1'));

    const mountCalls = invokeMock.mock.calls.filter(([ch]) => ch === 'renderer:mount-collection');
    expect(mountCalls).toHaveLength(1);
    expect(store.getState().collections.collections[0].mountStatus).toBe('mounting');

    mountDeferred.resolve('/tmp/transient');
    await flushMicrotasks();

    getTabsDeferred.resolve({
      tabs: [{ type: 'http-request', pathname: '/tmp/col-1/req-1.bru', permanent: true }],
      activeTab: { accessor: 'pathname', value: '/tmp/col-1/req-1.bru' }
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
      tabs: [{ type: 'http-request', pathname: '/tmp/col-1/req-1.bru', permanent: true }],
      activeTab: { accessor: 'pathname', value: '/tmp/col-1/req-1.bru' }
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
      collectionPathname: '/tmp/col-1',
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
});
