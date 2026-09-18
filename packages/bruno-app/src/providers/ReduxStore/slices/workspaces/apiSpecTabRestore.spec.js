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
  createCollection: jest.fn(() => () => Promise.resolve()),
  openMultipleCollections: jest.fn(() => () => Promise.resolve({ opened: [], failed: [], invalid: [] })),
  openScratchCollectionEvent: jest.fn(() => () => Promise.resolve()),
  mountCollection: jest.fn(() => () => Promise.resolve()),
  hydrateCollectionWithUiStateSnapshot: jest.fn(() => () => Promise.resolve())
}));

jest.mock('utils/mock-server/mock-server-instances', () => ({
  hydrateMockServerInstances: jest.fn(() => () => Promise.resolve())
}));

import { configureStore } from '@reduxjs/toolkit';
import workspacesReducer from './index';
import collectionsReducer from '../collections';
import chatReducer from '../chat';
import appReducer from '../app';
import tabsReducer from '../tabs';
import apiSpecReducer from '../apiSpec';
import globalEnvironmentsReducer from '../global-environments';
import { getApiSpecTabUid } from 'utils/api-specs';

const WORKSPACE_UID = 'workspace-a';
const SCRATCH_UID = 'scratch-a';
const WORKSPACE_PATH = '/workspaces/team';
const PETSTORE = `${WORKSPACE_PATH}/petstore.yaml`;
const ORDERS = `${WORKSPACE_PATH}/orders.yaml`;

let workspaceApiSpecPaths = [];

const snapshotWith = ({ apiSpecTabs = [], activeApiSpecTabPathname = null }) => ({
  version: '0.0.1',
  activeWorkspacePath: WORKSPACE_PATH,
  extras: { devTools: { open: false, activeTab: '', tabs: {} } },
  workspaces: [
    {
      pathname: WORKSPACE_PATH,
      environment: '',
      lastActiveCollectionPathname: null,
      activeWorkspaceTabType: null,
      sorting: 'default',
      apiSpecTabs,
      activeApiSpecTabPathname,
      collections: []
    }
  ],
  collections: []
});

let snapshot = snapshotWith({});

const mockIpcInvoke = (channel) => {
  if (channel === 'renderer:snapshot:get') return Promise.resolve(snapshot);
  if (channel === 'renderer:get-global-environments') {
    return Promise.resolve({ globalEnvironments: [], activeGlobalEnvironmentUid: null });
  }
  if (channel === 'renderer:load-workspace-apispecs') {
    return Promise.resolve(workspaceApiSpecPaths.map((specPath) => ({ path: specPath })));
  }
  if (channel === 'renderer:load-workspace-collections') return Promise.resolve([]);
  if (channel === 'renderer:load-unopenable-workspace-collections') return Promise.resolve([]);
  return Promise.resolve(null);
};

const createStore = () =>
  configureStore({
    reducer: {
      workspaces: workspacesReducer,
      collections: collectionsReducer,
      chat: chatReducer,
      app: appReducer,
      tabs: tabsReducer,
      apiSpec: apiSpecReducer,
      globalEnvironments: globalEnvironmentsReducer
    },
    preloadedState: {
      workspaces: {
        activeWorkspaceUid: null,
        workspaces: [
          {
            uid: WORKSPACE_UID,
            name: 'Team',
            pathname: WORKSPACE_PATH,
            collections: [],
            scratchCollectionUid: SCRATCH_UID
          }
        ]
      },
      collections: {
        collections: [
          {
            uid: SCRATCH_UID,
            pathname: `${WORKSPACE_PATH}/.scratch`,
            name: 'Scratch',
            items: [],
            brunoConfig: { version: '1', name: 'Scratch', type: 'collection' },
            mountStatus: 'mounted'
          }
        ],
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
      apiSpec: { apiSpecs: [] },
      globalEnvironments: {
        globalEnvironments: [],
        activeGlobalEnvironmentUid: null,
        globalEnvironmentDraft: null,
        _scriptGlobalEnvBaseline: null
      }
    }
  });

const specTabPaths = (store) =>
  store.getState().tabs.tabs.filter((tab) => tab.type === 'api-spec').map((tab) => tab.apiSpecPathname);

const activeTabType = (store) => {
  const { tabs, activeTabUid } = store.getState().tabs;
  return tabs.find((tab) => tab.uid === activeTabUid)?.type;
};

describe('reopening API spec tabs when a workspace is opened', () => {
  let switchWorkspace;

  beforeAll(async () => {
    window.ipcRenderer = { invoke: jest.fn(mockIpcInvoke) };
    ({ switchWorkspace } = await import('./actions'));
  });

  it('reopens the specs that were open last time', async () => {
    workspaceApiSpecPaths = [PETSTORE, ORDERS];
    snapshot = snapshotWith({ apiSpecTabs: [PETSTORE, ORDERS] });
    const store = createStore();

    await store.dispatch(switchWorkspace(WORKSPACE_UID));

    expect(specTabPaths(store)).toEqual([PETSTORE, ORDERS]);
  });

  it('leaves the spec the user was reading on when the workspace is reopened', async () => {
    workspaceApiSpecPaths = [PETSTORE, ORDERS];
    snapshot = snapshotWith({ apiSpecTabs: [PETSTORE, ORDERS], activeApiSpecTabPathname: ORDERS });
    const store = createStore();

    await store.dispatch(switchWorkspace(WORKSPACE_UID));

    expect(store.getState().tabs.activeTabUid).toBe(getApiSpecTabUid(SCRATCH_UID, ORDERS));
  });

  it('skips a spec that is no longer part of the workspace, rather than reopening a tab with nothing behind it', async () => {
    workspaceApiSpecPaths = [PETSTORE];
    snapshot = snapshotWith({ apiSpecTabs: [PETSTORE, ORDERS] });
    const store = createStore();

    await store.dispatch(switchWorkspace(WORKSPACE_UID));

    expect(specTabPaths(store)).toEqual([PETSTORE]);
  });

  it('falls back to the workspace overview when the spec that was active is gone', async () => {
    workspaceApiSpecPaths = [PETSTORE];
    snapshot = snapshotWith({ apiSpecTabs: [PETSTORE, ORDERS], activeApiSpecTabPathname: ORDERS });
    const store = createStore();

    await store.dispatch(switchWorkspace(WORKSPACE_UID));

    expect(activeTabType(store)).toBe('workspaceOverview');
  });

  it('opens no spec tabs when the workspace has none saved', async () => {
    workspaceApiSpecPaths = [PETSTORE];
    snapshot = snapshotWith({});
    const store = createStore();

    await store.dispatch(switchWorkspace(WORKSPACE_UID));

    expect(specTabPaths(store)).toEqual([]);
    expect(activeTabType(store)).toBe('workspaceOverview');
  });
});
