jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  ...jest.requireActual('providers/ReduxStore/slices/collections/actions'),
  closeTabs: jest.fn((payload) => ({ type: 'test/closeTabsAndDeleteTransientFiles', payload }))
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() }
}));

const DEFAULT_WORKSPACE = { uid: 'default', name: 'My Workspace', type: 'default', pathname: '/default' };

let closeWorkspaceAction;
let workspacesReducer;
let removeWorkspace;
let removeCollection;
let closeTabs;

beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
  ({ closeWorkspaceAction } = require('providers/ReduxStore/slices/workspaces/actions'));
  const workspacesModule = require('providers/ReduxStore/slices/workspaces');
  workspacesReducer = workspacesModule.default;
  ({ removeWorkspace } = workspacesModule);
  ({ removeCollection } = require('providers/ReduxStore/slices/collections'));
  ({ closeTabs } = require('providers/ReduxStore/slices/tabs'));
});

beforeEach(() => {
  window.ipcRenderer.invoke.mockClear();
});

const typeOf = (actionCreator) => actionCreator({}).type;

const run = async ({ closing, activeWorkspaceUid, options, collections = [], tabs = [] }) => {
  let workspaces = { activeWorkspaceUid, workspaces: [DEFAULT_WORKSPACE, closing] };

  const dispatched = [];
  const thunks = [];
  const dispatch = jest.fn((action) => {
    dispatched.push(action);
    if (typeof action === 'function') {
      thunks.push(action);
      return undefined;
    }
    if (typeof action?.type === 'string' && action.type.startsWith('workspaces/')) {
      workspaces = workspacesReducer(workspaces, action);
    }
    return action;
  });
  const getState = jest.fn(() => ({ workspaces, collections: { collections }, tabs: { tabs } }));

  await closeWorkspaceAction(closing.uid, options)(dispatch, getState);

  return { dispatch, dispatched, thunks, finalWorkspaces: () => workspaces };
};

describe('closeWorkspaceAction', () => {
  it('closes the workspace on disk via ipc using its pathname', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:close-workspace', '/team');
  });

  it('removes the workspace scratch collection when one is mounted', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { dispatch } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(dispatch).toHaveBeenCalledWith(removeCollection({ collectionUid: 'scratch-1' }));
  });

  it('closes the scratch collection\'s tabs, deleting unsaved request files, before removing it', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const tabs = [
      { uid: 'scratch-1-overview', collectionUid: 'scratch-1', type: 'workspaceOverview' },
      { uid: 'untitled-1', collectionUid: 'scratch-1', type: 'http-request' },
      { uid: 'other', collectionUid: 'payments', type: 'http-request' }
    ];
    const { dispatched } = await run({ closing, activeWorkspaceUid: 'ws-1', tabs });

    const closeIndex = dispatched.findIndex((a) => a?.type === 'test/closeTabsAndDeleteTransientFiles');
    const removeIndex = dispatched.findIndex((a) => a?.type === typeOf(removeCollection));
    expect(dispatched[closeIndex].payload).toEqual({ tabUids: ['scratch-1-overview', 'untitled-1'], reopenable: false });
    expect(closeIndex).toBeLessThan(removeIndex);
  });

  it('does not remove any scratch collection when the workspace has none', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team' };
    const { dispatched } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(dispatched.some((a) => a?.type === typeOf(removeCollection))).toBe(false);
  });

  it('removes the workspace from state', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { dispatch, finalWorkspaces } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(dispatch).toHaveBeenCalledWith(removeWorkspace('ws-1'));
    expect(finalWorkspaces().workspaces.find((w) => w.uid === 'ws-1')).toBeUndefined();
  });

  it('switches to the default workspace when the closed workspace was active', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { dispatched, thunks, finalWorkspaces } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(thunks).toHaveLength(1);

    const removeIdx = dispatched.findIndex((a) => a?.type === typeOf(removeWorkspace));
    const thunkIdx = dispatched.findIndex((a) => typeof a === 'function');
    expect(removeIdx).toBeGreaterThanOrEqual(0);
    expect(thunkIdx).toBeGreaterThan(removeIdx);

    expect(finalWorkspaces().activeWorkspaceUid).toBe('default');
  });

  it('does not switch workspaces when the closed workspace was not active', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { thunks, finalWorkspaces } = await run({ closing, activeWorkspaceUid: 'default' });

    expect(thunks).toHaveLength(0);
    expect(finalWorkspaces().activeWorkspaceUid).toBe('default');
  });

  it('throws when the workspace does not exist', async () => {
    const dispatch = jest.fn();
    const getState = jest.fn(() => ({ workspaces: { activeWorkspaceUid: 'default', workspaces: [DEFAULT_WORKSPACE] } }));

    await expect(closeWorkspaceAction('missing')(dispatch, getState)).rejects.toThrow('Workspace not found');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});

describe('closeWorkspaceAction with deleteFiles', () => {
  const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
  const invokedChannels = () => window.ipcRenderer.invoke.mock.calls.map(([channel]) => channel);

  it('deletes the workspace folder before closing the workspace', async () => {
    await run({ closing, activeWorkspaceUid: 'ws-1', options: { deleteFiles: true } });

    expect(invokedChannels()).toEqual(['renderer:delete-workspace', 'renderer:close-workspace']);
  });

  it('keeps the workspace open when deleting its folder fails', async () => {
    window.ipcRenderer.invoke.mockRejectedValueOnce(new Error('EBUSY: resource busy'));

    await expect(run({ closing, activeWorkspaceUid: 'ws-1', options: { deleteFiles: true } })).rejects.toThrow('EBUSY');
    expect(invokedChannels()).toEqual(['renderer:delete-workspace']);
  });

  it('still removes the workspace and its collections when the folder is only partly deleted', async () => {
    window.ipcRenderer.invoke.mockResolvedValueOnce({ success: false, error: 'EBUSY: resource busy', detachedPaths: ['/team/collections/api'] });
    const toast = require('react-hot-toast').default;
    const collections = [{ uid: 'inner', pathname: '/team/collections/api' }];
    const tabs = [{ uid: 'inner-tab', collectionUid: 'inner' }];

    const { dispatch, finalWorkspaces } = await run({ closing, activeWorkspaceUid: 'ws-1', options: { deleteFiles: true }, collections, tabs });

    expect(invokedChannels()).toEqual(['renderer:delete-workspace', 'renderer:close-workspace']);
    expect(finalWorkspaces().workspaces.map((w) => w.uid)).toEqual(['default']);
    expect(dispatch).toHaveBeenCalledWith(closeTabs({ tabUids: ['inner-tab'], reopenable: false }));
    expect(dispatch).toHaveBeenCalledWith(removeCollection({ collectionUid: 'inner' }));
    expect(toast.error).toHaveBeenCalledWith('Removed "Team WS", but some of its files couldn\'t be deleted');
  });

  it('removes exactly the collections the main process detached', async () => {
    window.ipcRenderer.invoke.mockResolvedValueOnce({ success: true, detachedPaths: ['/team/collections/api'] });
    const collections = [
      { uid: 'inner', pathname: '/team/collections/api' },
      { uid: 'outside', pathname: '/elsewhere/legacy' },
      { uid: 'sibling', pathname: '/team-2/api' },
      { uid: 'not-detached', pathname: '/team/collections/kept-by-main' }
    ];
    const tabs = [
      { uid: 'inner-tab', collectionUid: 'inner' },
      { uid: 'outside-tab', collectionUid: 'outside' }
    ];
    const { dispatch, dispatched } = await run({ closing, activeWorkspaceUid: 'ws-1', options: { deleteFiles: true }, collections, tabs });

    expect(dispatch).toHaveBeenCalledWith(closeTabs({ tabUids: ['inner-tab'], reopenable: false }));
    expect(dispatch).toHaveBeenCalledWith(removeCollection({ collectionUid: 'inner' }));
    const removedUids = dispatched.filter((a) => a?.type === typeOf(removeCollection)).map((a) => a.payload.collectionUid);
    expect(removedUids).not.toContain('outside');
    expect(removedUids).not.toContain('sibling');
    expect(removedUids).not.toContain('not-detached');
  });
});
