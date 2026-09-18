jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() }
}));

import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import apiSpecReducer, {
  clearApiSpecDraft,
  closeApiSpecFile,
  dropApiSpecTabsMissingFrom,
  openApiSpecTab,
  saveApiSpecTabDraft,
  updateApiSpecDraft
} from 'providers/ReduxStore/slices/apiSpec';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import { getApiSpecTabUid } from 'utils/api-specs';

const SCRATCH_UID = 'scratch-collection';
const SPEC_PATHNAME = '/workspace/petstore.yaml';
const SAVED_CONTENT = 'openapi: 3.0.0';
const EDITED_CONTENT = 'openapi: 3.1.0';

const TAB_UID = getApiSpecTabUid(SCRATCH_UID, SPEC_PATHNAME);

const buildStore = ({ draft, specLoaded = true } = {}) =>
  configureStore({
    reducer: { tabs: tabsReducer, apiSpec: apiSpecReducer },
    preloadedState: {
      tabs: {
        tabs: [
          {
            uid: TAB_UID,
            collectionUid: SCRATCH_UID,
            type: 'api-spec',
            apiSpecPathname: SPEC_PATHNAME
          }
        ],
        activeTabUid: TAB_UID,
        recentlyClosedTabs: []
      },
      apiSpec: {
        apiSpecs: specLoaded
          ? [
              {
                uid: 'runtime-uid',
                pathname: SPEC_PATHNAME,
                raw: SAVED_CONTENT,
                filename: 'petstore.yaml',
                ...(draft === undefined ? {} : { draft })
              }
            ]
          : []
      }
    }
  });

const getSpec = (store) => store.getState().apiSpec.apiSpecs[0];

describe('unsaved edits on an API spec', () => {
  it('records the edits on the spec, so every view of that spec sees the same unsaved work', () => {
    const store = buildStore();

    store.dispatch(updateApiSpecDraft({ uid: 'runtime-uid', content: EDITED_CONTENT }));
    expect(getSpec(store).draft).toBe(EDITED_CONTENT);

    store.dispatch(clearApiSpecDraft({ uid: 'runtime-uid' }));
    expect(getSpec(store).draft).toBeUndefined();
  });

  it('keeps each spec\'s unsaved edits separate from the other specs', () => {
    const store = configureStore({
      reducer: { apiSpec: apiSpecReducer },
      preloadedState: {
        apiSpec: {
          apiSpecs: [
            { uid: 'petstore', pathname: SPEC_PATHNAME, raw: SAVED_CONTENT },
            { uid: 'orders', pathname: '/workspace/orders.yaml', raw: SAVED_CONTENT }
          ]
        }
      }
    });

    store.dispatch(updateApiSpecDraft({ uid: 'petstore', content: 'petstore edit' }));

    expect(store.getState().apiSpec.apiSpecs[0].draft).toBe('petstore edit');
    expect(store.getState().apiSpec.apiSpecs[1].draft).toBeUndefined();
  });
});

describe('saveApiSpecTabDraft', () => {
  beforeEach(() => {
    toast.error.mockClear();
    toast.success.mockClear();
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  });

  it('writes the edited spec to disk and drops the unsaved marker', async () => {
    const store = buildStore({ draft: EDITED_CONTENT });

    await store.dispatch(saveApiSpecTabDraft(TAB_UID));

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:save-api-spec', SPEC_PATHNAME, EDITED_CONTENT);
    expect(getSpec(store).draft).toBeUndefined();
    expect(getSpec(store).raw).toBe(EDITED_CONTENT);
  });

  it('keeps the unsaved edits when the file cannot be written', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('EACCES: permission denied'));
    const store = buildStore({ draft: EDITED_CONTENT });

    await expect(store.dispatch(saveApiSpecTabDraft(TAB_UID))).rejects.toThrow('EACCES: permission denied');

    expect(getSpec(store).draft).toBe(EDITED_CONTENT);
    expect(getSpec(store).raw).toBe(SAVED_CONTENT);
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('writes nothing when the spec is not loaded, because there are no edits to lose', async () => {
    const store = buildStore({ specLoaded: false });

    await store.dispatch(saveApiSpecTabDraft(TAB_UID));

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('does nothing when the spec has no unsaved edits', async () => {
    const store = buildStore();

    await store.dispatch(saveApiSpecTabDraft(TAB_UID));

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('drops the unsaved marker without writing when the edits match what is already on disk', async () => {
    const store = buildStore({ draft: SAVED_CONTENT });

    await store.dispatch(saveApiSpecTabDraft(TAB_UID));

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(getSpec(store).draft).toBeUndefined();
  });

  it('keeps edits typed while the write was still in flight, instead of reverting to what reached disk', async () => {
    let finishWrite;
    window.ipcRenderer.invoke.mockReturnValue(new Promise((resolve) => { finishWrite = resolve; }));
    const store = buildStore({ draft: EDITED_CONTENT });
    const KEPT_TYPING = `${EDITED_CONTENT}\ninfo:`;

    const saving = store.dispatch(saveApiSpecTabDraft(TAB_UID));
    store.dispatch(updateApiSpecDraft({ uid: 'runtime-uid', content: KEPT_TYPING }));
    finishWrite();
    await saving;

    expect(getSpec(store).raw).toBe(EDITED_CONTENT);
    expect(getSpec(store).draft).toBe(KEPT_TYPING);
  });

  it('does nothing when the tab it was asked to save has already been closed', async () => {
    const store = buildStore({ draft: EDITED_CONTENT });

    await store.dispatch(saveApiSpecTabDraft('a-tab-that-is-gone'));

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(getSpec(store).draft).toBe(EDITED_CONTENT);
  });
});

const ORDERS_PATHNAME = '/workspace/orders.yaml';
const OTHER_SPEC_PATHNAME = '/other-workspace/billing.yaml';

const buildTwoWorkspaceStore = () =>
  configureStore({
    reducer: { tabs: tabsReducer, apiSpec: apiSpecReducer, workspaces: (state = {}) => state },
    preloadedState: {
      workspaces: {
        activeWorkspaceUid: 'workspace-a',
        workspaces: [
          { uid: 'workspace-a', scratchCollectionUid: 'scratch-a' },
          { uid: 'workspace-b', scratchCollectionUid: 'scratch-b' }
        ]
      },
      tabs: {
        tabs: [
          {
            uid: getApiSpecTabUid('scratch-a', SPEC_PATHNAME),
            collectionUid: 'scratch-a',
            type: 'api-spec',
            apiSpecPathname: SPEC_PATHNAME
          },
          {
            uid: getApiSpecTabUid('scratch-a', ORDERS_PATHNAME),
            collectionUid: 'scratch-a',
            type: 'api-spec',
            apiSpecPathname: ORDERS_PATHNAME
          },
          {
            uid: getApiSpecTabUid('scratch-b', OTHER_SPEC_PATHNAME),
            collectionUid: 'scratch-b',
            type: 'api-spec',
            apiSpecPathname: OTHER_SPEC_PATHNAME
          }
        ],
        activeTabUid: getApiSpecTabUid('scratch-a', SPEC_PATHNAME),
        recentlyClosedTabs: []
      },
      apiSpec: { apiSpecs: [] }
    }
  });

const openSpecPaths = (store) => store.getState().tabs.tabs.map((tab) => tab.apiSpecPathname);

describe('dropApiSpecTabsMissingFrom', () => {
  it('closes the tab of a spec that is no longer part of the workspace', () => {
    const store = buildTwoWorkspaceStore();

    store.dispatch(dropApiSpecTabsMissingFrom('workspace-a', [SPEC_PATHNAME]));

    expect(openSpecPaths(store)).toEqual([SPEC_PATHNAME, OTHER_SPEC_PATHNAME]);
  });

  it('leaves another workspace\'s spec tabs alone, so switching workspaces does not close them', () => {
    const store = buildTwoWorkspaceStore();

    store.dispatch(dropApiSpecTabsMissingFrom('workspace-a', []));

    expect(openSpecPaths(store)).toEqual([OTHER_SPEC_PATHNAME]);
  });

  it('does not offer to reopen a tab it closed, because the spec behind it is gone', () => {
    const store = buildTwoWorkspaceStore();

    store.dispatch(dropApiSpecTabsMissingFrom('workspace-a', [SPEC_PATHNAME]));

    expect(store.getState().tabs.recentlyClosedTabs).toEqual([]);
  });

  it('does nothing for a workspace that has no scratch collection to hold spec tabs', () => {
    const store = buildTwoWorkspaceStore();

    store.dispatch(dropApiSpecTabsMissingFrom('workspace-that-does-not-exist', []));

    expect(openSpecPaths(store)).toEqual([SPEC_PATHNAME, ORDERS_PATHNAME, OTHER_SPEC_PATHNAME]);
  });
});

describe('removing an API spec from a workspace', () => {
  const WORKSPACE_A = 'workspace-a';
  const WORKSPACE_B = 'workspace-b';
  const SCRATCH_B = 'scratch-collection-b';

  const apiSpecTab = (collectionUid) => ({
    uid: getApiSpecTabUid(collectionUid, SPEC_PATHNAME),
    collectionUid,
    type: 'api-spec',
    apiSpecPathname: SPEC_PATHNAME
  });

  const buildStoreWithBothWorkspaces = () =>
    configureStore({
      reducer: { tabs: tabsReducer, apiSpec: apiSpecReducer, workspaces: (state = {}) => state },
      preloadedState: {
        workspaces: {
          activeWorkspaceUid: WORKSPACE_A,
          workspaces: [
            { uid: WORKSPACE_A, pathname: '/workspace-a', scratchCollectionUid: SCRATCH_UID },
            { uid: WORKSPACE_B, pathname: '/workspace-b', scratchCollectionUid: SCRATCH_B }
          ]
        },
        tabs: {
          tabs: [apiSpecTab(SCRATCH_UID), apiSpecTab(SCRATCH_B)],
          activeTabUid: getApiSpecTabUid(SCRATCH_UID, SPEC_PATHNAME),
          recentlyClosedTabs: []
        },
        apiSpec: {
          apiSpecs: [{ uid: 'runtime-uid', pathname: SPEC_PATHNAME, raw: SAVED_CONTENT, filename: 'petstore.yaml' }]
        }
      }
    });

  beforeEach(() => {
    jest.resetModules();
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  });

  it('leaves another workspace\'s tab on the same spec file open', async () => {
    const store = buildStoreWithBothWorkspaces();
    const workspaceActions = require('providers/ReduxStore/slices/workspaces/actions');
    const loadSpy = jest
      .spyOn(workspaceActions, 'loadWorkspaceApiSpecs')
      .mockReturnValue(() => Promise.resolve());

    await store.dispatch(closeApiSpecFile({ uid: 'runtime-uid' }));

    expect(store.getState().tabs.tabs.map((tab) => tab.collectionUid)).toEqual([SCRATCH_B]);

    loadSpy.mockRestore();
  });
});

describe('opening an API spec from the sidebar', () => {
  const WORKSPACE_UID = 'workspace-a';

  const workspacesTestReducer = (state = {}, action) =>
    action.type === 'test/switchWorkspace' ? { ...state, activeWorkspaceUid: action.payload } : state;

  const buildWorkspaceStore = ({ scratchCollectionUid }) =>
    configureStore({
      reducer: { tabs: tabsReducer, apiSpec: apiSpecReducer, workspaces: workspacesTestReducer },
      preloadedState: {
        workspaces: {
          activeWorkspaceUid: WORKSPACE_UID,
          workspaces: [{ uid: WORKSPACE_UID, pathname: '/workspace', scratchCollectionUid }]
        },
        tabs: { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
        apiSpec: { apiSpecs: [] }
      }
    });

  beforeEach(() => {
    toast.error.mockClear();
    jest.resetModules();
  });

  it('opens the spec in a tab on the workspace scratch collection', async () => {
    const store = buildWorkspaceStore({ scratchCollectionUid: SCRATCH_UID });

    await store.dispatch(openApiSpecTab({ pathname: SPEC_PATHNAME, filename: 'petstore.yaml' }));

    expect(store.getState().tabs.tabs).toHaveLength(1);
    expect(store.getState().tabs.tabs[0].apiSpecPathname).toBe(SPEC_PATHNAME);
    expect(store.getState().tabs.activeTabUid).toBe(getApiSpecTabUid(SCRATCH_UID, SPEC_PATHNAME));
  });

  it('mounts the scratch collection first when the workspace has none yet, instead of doing nothing', async () => {
    const store = buildWorkspaceStore({ scratchCollectionUid: null });
    const workspaceActions = require('providers/ReduxStore/slices/workspaces/actions');
    const mountSpy = jest
      .spyOn(workspaceActions, 'mountScratchCollection')
      .mockReturnValue(() => Promise.resolve({ uid: SCRATCH_UID }));

    await store.dispatch(openApiSpecTab({ pathname: SPEC_PATHNAME, filename: 'petstore.yaml' }));

    expect(mountSpy).toHaveBeenCalledWith(WORKSPACE_UID);
    expect(store.getState().tabs.tabs).toHaveLength(1);
    expect(store.getState().tabs.tabs[0].collectionUid).toBe(SCRATCH_UID);

    mountSpy.mockRestore();
  });

  it('tells the user when the spec cannot be opened because the workspace has no place to put it', async () => {
    const store = buildWorkspaceStore({ scratchCollectionUid: null });
    const workspaceActions = require('providers/ReduxStore/slices/workspaces/actions');
    const mountSpy = jest
      .spyOn(workspaceActions, 'mountScratchCollection')
      .mockReturnValue(() => Promise.resolve(null));

    await store.dispatch(openApiSpecTab({ pathname: SPEC_PATHNAME, filename: 'petstore.yaml' }));

    expect(store.getState().tabs.tabs).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();

    mountSpy.mockRestore();
  });

  it('does not open the tab when the user switched workspaces while the scratch collection was mounting', async () => {
    const store = buildWorkspaceStore({ scratchCollectionUid: null });
    const workspaceActions = require('providers/ReduxStore/slices/workspaces/actions');
    const mountSpy = jest
      .spyOn(workspaceActions, 'mountScratchCollection')
      .mockReturnValue(async (dispatch) => {
        dispatch({ type: 'test/switchWorkspace', payload: 'workspace-b' });
        return { uid: SCRATCH_UID };
      });

    await store.dispatch(openApiSpecTab({ pathname: SPEC_PATHNAME, filename: 'petstore.yaml' }));

    expect(store.getState().tabs.tabs).toHaveLength(0);
    expect(store.getState().tabs.activeTabUid).toBeNull();

    mountSpy.mockRestore();
  });

  it('tells the user when there is no spec path to open', async () => {
    const store = buildWorkspaceStore({ scratchCollectionUid: SCRATCH_UID });

    await store.dispatch(openApiSpecTab({ filename: 'petstore.yaml' }));

    expect(store.getState().tabs.tabs).toHaveLength(0);
    expect(toast.error).toHaveBeenCalled();
  });
});
