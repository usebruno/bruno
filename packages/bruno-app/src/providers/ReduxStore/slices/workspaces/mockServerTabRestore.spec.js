jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('../collections/actions', () => ({
  mountCollection: jest.fn(() => () => Promise.resolve())
}));

import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer from './index';
import collectionsReducer from '../collections';
import appReducer from '../app';
import tabsReducer from '../tabs';
import { hydrateSnapshotForOpenedCollection } from './actions';

const WORKSPACE_UID = 'workspace-a';
const WORKSPACE_PATH = '/workspaces/team';
const COLLECTION_UID = 'collection-a';
const COLLECTION_PATH = `${WORKSPACE_PATH}/collections/pets`;

const tabsSnapshot = {
  tabs: [
    { type: 'variables', accessor: 'type', permanent: true },
    { type: 'mock-server', mockServerUid: 'mock-server-1', name: 'Pets Mock', permanent: true },
    { type: 'mock-response', mockServerUid: 'mock-server-1', responseUid: 'mock-response-1', name: 'Get pet', permanent: true }
  ],
  activeTab: { accessor: 'type::mockResponseUid', value: 'mock-response-1' }
};

const createStore = (mockServerEnabled) => configureStore({
  reducer: {
    workspaces: workspacesReducer,
    collections: collectionsReducer,
    app: appReducer,
    tabs: tabsReducer
  },
  preloadedState: {
    workspaces: {
      activeWorkspaceUid: WORKSPACE_UID,
      workspaces: [{ uid: WORKSPACE_UID, name: 'Team', pathname: WORKSPACE_PATH, collections: [] }]
    },
    collections: {
      collections: [
        {
          uid: COLLECTION_UID,
          pathname: COLLECTION_PATH,
          name: 'Pets',
          items: [],
          brunoConfig: { version: '1', name: 'Pets', type: 'collection' },
          mountStatus: 'mounted'
        }
      ],
      collectionSortOrder: 'default',
      activeConnections: [],
      tempDirectories: {},
      saveTransientRequestModals: []
    },
    app: {
      snapshotReady: false,
      snapshotHydration: {
        workspaceUid: WORKSPACE_UID,
        pendingCollectionPathnames: [COLLECTION_PATH],
        activeCollectionPathname: COLLECTION_PATH,
        startedAt: Date.now()
      },
      preferences: { beta: { 'mock-server': mockServerEnabled } }
    },
    tabs: { tabs: [], activeTabUid: null, recentlyClosedTabs: [] }
  }
});

const openTabTypes = (store) => store.getState().tabs.tabs.map((tab) => tab.type);

const activeTabType = (store) => {
  const { tabs, activeTabUid } = store.getState().tabs;
  return tabs.find((tab) => tab.uid === activeTabUid)?.type;
};

describe('restoring a collection opened during snapshot hydration', () => {
  beforeEach(() => {
    window.ipcRenderer = {
      invoke: jest.fn((channel) => Promise.resolve(channel === 'renderer:snapshot:get-tabs' ? tabsSnapshot : null)),
      on: jest.fn(() => () => {})
    };
  });

  it('does not reopen a saved mock response as the active tab when Mock Server is off', async () => {
    const store = createStore(false);

    await store.dispatch(hydrateSnapshotForOpenedCollection(COLLECTION_PATH));

    expect(openTabTypes(store)).toEqual(['variables']);
    expect(activeTabType(store)).not.toBe('mock-response');
  });

  it('reopens the saved mock response as the active tab when Mock Server is on', async () => {
    const store = createStore(true);

    await store.dispatch(hydrateSnapshotForOpenedCollection(COLLECTION_PATH));

    expect(openTabTypes(store)).toEqual(['variables', 'mock-server', 'mock-response']);
    expect(activeTabType(store)).toBe('mock-response');
  });
});
