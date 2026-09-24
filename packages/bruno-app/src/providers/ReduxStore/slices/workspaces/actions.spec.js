jest.mock('@usebruno/schema', () => ({
  collectionSchema: { validate: () => Promise.resolve() },
  environmentSchema: { validate: () => Promise.resolve() },
  itemSchema: { validate: () => Promise.resolve() }
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

jest.mock('../collections/actions', () => ({
  createCollection: jest.fn(() => () => Promise.resolve()),
  openMultipleCollections: jest.fn(() => () => Promise.resolve({ opened: [], failed: [], invalid: [] })),
  openScratchCollectionEvent: jest.fn(() => () => Promise.resolve()),
  mountCollection: jest.fn(() => () => Promise.resolve()),
  hydrateCollectionWithUiStateSnapshot: jest.fn(() => () => Promise.resolve())
}));

import os from 'os';
import path from 'path';
import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer, { updateWorkspace } from './index';
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
  pathname: path.join(os.tmpdir(), uid),
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

describe('collections that fail to open on workspace switch', () => {
  let switchWorkspace;
  let toast;
  let openMultipleCollections;

  const WS_B_PATH = path.join(os.tmpdir(), 'ws-b');
  const HEALTHY_COLL = path.join(os.tmpdir(), 'healthy-coll');
  const MISSING_COLL = path.join(os.tmpdir(), 'missing-coll');
  const EMPTY_COLL = path.join(os.tmpdir(), 'empty-coll');
  const BROKEN_COLL = path.join(os.tmpdir(), 'broken-coll');

  let workspaceCollections;
  let unopenableCollections;
  let openResult;

  beforeAll(async () => {
    ({ default: toast } = await import('react-hot-toast'));
    ({ openMultipleCollections } = await import('../collections/actions'));
    ({ switchWorkspace } = await import('./actions'));
  });

  beforeEach(() => {
    toast.error.mockClear();
    openMultipleCollections.mockClear();

    workspaceCollections = [{ name: 'Healthy', path: HEALTHY_COLL }];
    unopenableCollections = [];
    openResult = { opened: [HEALTHY_COLL], failed: [], invalid: [] };

    openMultipleCollections.mockImplementation(() => () => Promise.resolve(openResult));

    // actions.js captures `const { ipcRenderer } = window` at import time, so mutate
    // the existing object's `invoke` rather than reassigning window.ipcRenderer.
    window.ipcRenderer.invoke = jest.fn((channel) => {
      if (channel === 'renderer:load-workspace-collections') {
        return Promise.resolve(workspaceCollections);
      }
      if (channel === 'renderer:load-unopenable-workspace-collections') {
        return Promise.resolve(unopenableCollections);
      }
      return mockIpcInvoke(channel);
    });
  });

  const switchToWorkspaceB = async () => {
    const store = createStore();
    store.dispatch(updateWorkspace({ uid: WS_B, pathname: WS_B_PATH }));
    await store.dispatch(switchWorkspace(WS_B));
    return store;
  };

  it('does not notify when every collection opens', async () => {
    await switchToWorkspaceB();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('suppresses the per-collection errors from main so the aggregate toast is the only notification', async () => {
    await switchToWorkspaceB();

    expect(openMultipleCollections).toHaveBeenCalledWith(
      [HEALTHY_COLL],
      { workspacePath: WS_B_PATH, dontSendDisplayErrors: true }
    );
  });

  it('notifies about entries that the workspace config could not resolve', async () => {
    unopenableCollections = [
      { name: 'Missing', path: MISSING_COLL },
      { name: 'Empty', path: EMPTY_COLL }
    ];

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to open 2 collections');
  });

  it('uses the singular form for a single failure', async () => {
    unopenableCollections = [{ name: 'Missing', path: MISSING_COLL }];

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('notifies when a resolvable collection fails to open at runtime', async () => {
    workspaceCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    openResult = { opened: [], failed: [{ path: BROKEN_COLL, error: 'boom' }], invalid: [] };

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('counts a collection once when both the config and the open attempt report it', async () => {
    workspaceCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    unopenableCollections = [{ name: 'Broken', path: BROKEN_COLL }];
    openResult = { opened: [], failed: [{ path: BROKEN_COLL, error: 'boom' }], invalid: [] };

    await switchToWorkspaceB();

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Failed to open 1 collection');
  });

  it('notifies when every collection in the workspace is unresolvable', async () => {
    workspaceCollections = [];
    unopenableCollections = [
      { name: 'Missing', path: MISSING_COLL },
      { name: 'Empty', path: EMPTY_COLL }
    ];

    await switchToWorkspaceB();

    expect(openMultipleCollections).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to open 2 collections');
  });
});
