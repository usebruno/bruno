jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
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

beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(true) };
  ({ closeWorkspaceAction } = require('providers/ReduxStore/slices/workspaces/actions'));
  const workspacesModule = require('providers/ReduxStore/slices/workspaces');
  workspacesReducer = workspacesModule.default;
  ({ removeWorkspace } = workspacesModule);
  ({ removeCollection } = require('providers/ReduxStore/slices/collections'));
});

beforeEach(() => {
  window.ipcRenderer.invoke.mockClear();
});

const typeOf = (actionCreator) => actionCreator({}).type;

const run = async ({ closing, activeWorkspaceUid }) => {
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
  const getState = jest.fn(() => ({ workspaces }));

  await closeWorkspaceAction(closing.uid)(dispatch, getState);

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
