jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() }
}));

const DEFAULT_WORKSPACE = { uid: 'default', name: 'My Workspace', type: 'default', pathname: '/default' };

let closeWorkspaceAction;
let removeWorkspace;
let removeCollection;

beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
  ({ closeWorkspaceAction } = require('providers/ReduxStore/slices/workspaces/actions'));
  ({ removeWorkspace } = require('providers/ReduxStore/slices/workspaces'));
  ({ removeCollection } = require('providers/ReduxStore/slices/collections'));
});

beforeEach(() => {
  window.ipcRenderer.invoke.mockClear();
});

const run = async ({ closing, activeWorkspaceUid }) => {
  const state = {
    workspaces: {
      activeWorkspaceUid,
      workspaces: [DEFAULT_WORKSPACE, closing]
    }
  };
  const dispatch = jest.fn();
  const getState = jest.fn(() => state);

  await closeWorkspaceAction(closing.uid)(dispatch, getState);

  const dispatched = dispatch.mock.calls.map((c) => c[0]);
  const thunks = dispatched.filter((a) => typeof a === 'function');
  return { dispatch, dispatched, thunks };
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

  it('does not remove a scratch collection when the workspace has none', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team' };
    const { dispatched } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(dispatched).not.toContainEqual(removeCollection({ collectionUid: undefined }));
  });

  it('removes the workspace from state', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { dispatch } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(dispatch).toHaveBeenCalledWith(removeWorkspace('ws-1'));
  });

  it('switches to the default workspace when the closed workspace was active', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { thunks } = await run({ closing, activeWorkspaceUid: 'ws-1' });

    expect(thunks).toHaveLength(1);
  });

  it('does not switch workspaces when the closed workspace was not active', async () => {
    const closing = { uid: 'ws-1', name: 'Team WS', type: 'local', pathname: '/team', scratchCollectionUid: 'scratch-1' };
    const { thunks } = await run({ closing, activeWorkspaceUid: 'default' });

    expect(thunks).toHaveLength(0);
  });

  it('throws when the workspace does not exist', async () => {
    const dispatch = jest.fn();
    const getState = jest.fn(() => ({ workspaces: { activeWorkspaceUid: 'default', workspaces: [DEFAULT_WORKSPACE] } }));

    await expect(closeWorkspaceAction('missing')(dispatch, getState)).rejects.toThrow('Workspace not found');
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
