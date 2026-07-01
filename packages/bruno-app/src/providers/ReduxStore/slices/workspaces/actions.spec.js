jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer from './index';
import collectionsReducer from '../collections';
import chatReducer, { openAiSidebar } from '../chat';
import appReducer from '../app';
import tabsReducer from '../tabs';
import globalEnvironmentsReducer from '../global-environments';

const WS_A = 'workspace-a';
const WS_B = 'workspace-b';
const SCRATCH_A = 'scratch-a';
const SCRATCH_B = 'scratch-b';

const makeScratchCollection = (uid) => ({
  uid,
  pathname: `/tmp/${uid}`,
  name: 'Scratch',
  items: [],
  brunoConfig: { version: '1', name: 'Scratch', type: 'collection' },
  mountStatus: 'mounted'
});

const makeWorkspace = (uid, scratchUid) => ({
  uid,
  name: uid,
  pathname: null,
  collections: [],
  scratchCollectionUid: scratchUid
});

const mockIpcInvoke = (channel) => {
  if (channel === 'renderer:snapshot:get') {
    return Promise.resolve(null);
  }
  if (channel === 'renderer:get-global-environments') {
    return Promise.resolve({ globalEnvironments: [], activeGlobalEnvironmentUid: null });
  }
  return Promise.resolve(null);
};

const createStore = ({ activeWorkspaceUid = WS_A } = {}) => {
  const preloadedState = {
    workspaces: {
      activeWorkspaceUid,
      workspaces: [makeWorkspace(WS_A, SCRATCH_A), makeWorkspace(WS_B, SCRATCH_B)]
    },
    collections: {
      collections: [makeScratchCollection(SCRATCH_A), makeScratchCollection(SCRATCH_B)],
      collectionSortOrder: 'default',
      activeConnections: [],
      tempDirectories: {},
      saveTransientRequestModals: []
    },
    chat: { isOpen: false, chats: {} },
    app: {
      snapshotReady: true,
      snapshotHydration: {
        workspaceUid: null,
        pendingCollectionPathnames: [],
        activeCollectionPathname: null,
        startedAt: null
      },
      preferences: { cache: { file: { enabled: false } } }
    },
    tabs: { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
    globalEnvironments: {
      globalEnvironments: [],
      activeGlobalEnvironmentUid: null,
      globalEnvironmentDraft: null,
      _scriptGlobalEnvBaseline: null
    }
  };

  return configureStore({
    reducer: {
      workspaces: workspacesReducer,
      collections: collectionsReducer,
      chat: chatReducer,
      app: appReducer,
      tabs: tabsReducer,
      globalEnvironments: globalEnvironmentsReducer
    },
    preloadedState
  });
};

describe('switchWorkspace', () => {
  let switchWorkspace;

  beforeAll(async () => {
    window.ipcRenderer = { invoke: jest.fn(mockIpcInvoke) };
    ({ switchWorkspace } = await import('./actions'));
  });

  it('closes the AI sidebar when switching workspaces', async () => {
    const store = createStore();
    store.dispatch(openAiSidebar());
    expect(store.getState().chat.isOpen).toBe(true);

    await store.dispatch(switchWorkspace(WS_B));

    expect(store.getState().chat.isOpen).toBe(false);
    expect(store.getState().workspaces.activeWorkspaceUid).toBe(WS_B);
  });
});
