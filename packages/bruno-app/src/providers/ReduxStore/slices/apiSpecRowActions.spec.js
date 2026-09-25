import { renameApiSpec, cloneApiSpec, deleteApiSpec, closeApiSpecFile, removeApiSpec } from './apiSpec';
import { closeTabs } from './tabs';
import { getApiSpecTabUid } from 'utils/api-specs';

jest.mock('./workspaces/actions', () => ({
  loadWorkspaceApiSpecs: jest.fn((uid) => ({ type: 'test/loadWorkspaceApiSpecs', uid }))
}));

const SCRATCH_UID = 'scratch-ws1';

const spec = (uid) => ({ uid, name: uid, pathname: `/ws/${uid}.yaml`, filename: `${uid}.yaml` });

const specTab = (uid) => ({
  uid: getApiSpecTabUid(SCRATCH_UID, `/ws/${uid}.yaml`),
  collectionUid: SCRATCH_UID,
  type: 'api-spec',
  apiSpecPathname: `/ws/${uid}.yaml`
});

const stateWithWorkspace = (apiSpecs, openTabs = []) => ({
  apiSpec: { apiSpecs },
  tabs: { tabs: openTabs, activeTabUid: openTabs[0]?.uid || null, recentlyClosedTabs: [] },
  workspaces: {
    activeWorkspaceUid: 'ws1',
    workspaces: [{ uid: 'ws1', pathname: '/ws', scratchCollectionUid: SCRATCH_UID }]
  }
});

const runThunks = (getState) => {
  const dispatch = jest.fn((action) => (typeof action === 'function' ? action(dispatch, getState) : action));
  return dispatch;
};

describe('renameApiSpec thunk', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  });

  it('renames over IPC using the spec path and workspace path, then reloads workspace specs', async () => {
    const dispatch = jest.fn();

    await renameApiSpec({ uid: 'a', newName: 'Orders API' })(dispatch, () => stateWithWorkspace([spec('a')]));

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:rename-api-spec', '/ws/a.yaml', 'Orders API', '/ws');
    expect(dispatch).toHaveBeenCalledWith({ type: 'test/loadWorkspaceApiSpecs', uid: 'ws1' });
  });

  it('rejects without calling IPC when the spec is not loaded', async () => {
    await expect(renameApiSpec({ uid: 'missing', newName: 'X' })(jest.fn(), () => stateWithWorkspace([spec('a')]))).rejects.toThrow('API Spec not found');

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });

  it('propagates an IPC failure and does not reload', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('disk full'));
    const dispatch = jest.fn();

    await expect(renameApiSpec({ uid: 'a', newName: 'X' })(dispatch, () => stateWithWorkspace([spec('a')]))).rejects.toThrow('disk full');

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('cloneApiSpec thunk', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue('/ws/apispec/a copy.yaml') };
  });

  it('clones over IPC with source path, name, location and workspace path, then reloads workspace specs', async () => {
    const dispatch = jest.fn().mockResolvedValue(undefined);

    const result = await cloneApiSpec({ uid: 'a', name: 'a copy', location: '/ws/apispec' })(dispatch, () => stateWithWorkspace([spec('a')]));

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:clone-api-spec', '/ws/a.yaml', 'a copy', '/ws/apispec', '/ws');
    expect(dispatch).toHaveBeenCalledWith({ type: 'test/loadWorkspaceApiSpecs', uid: 'ws1' });
    expect(result).toBe('/ws/apispec/a copy.yaml');
  });

  it('rejects without calling IPC when the spec is not loaded', async () => {
    await expect(cloneApiSpec({ uid: 'missing', name: 'x', location: '/ws' })(jest.fn(), () => stateWithWorkspace([]))).rejects.toThrow('API Spec not found');

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});

describe.each([
  ['deleteApiSpec', deleteApiSpec, 'renderer:delete-api-spec'],
  ['closeApiSpecFile', closeApiSpecFile, 'renderer:remove-api-spec']
])('%s thunk', (_, thunk, channel) => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue(undefined) };
  });

  it(`calls ${channel} with the spec path and workspace path`, async () => {
    const getState = () => stateWithWorkspace([spec('a')]);

    await thunk({ uid: 'a' })(runThunks(getState), getState);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(channel, '/ws/a.yaml', '/ws');
  });

  it('closes the open tab of the removed spec, drops it from state and reloads workspace specs', async () => {
    const getState = () => stateWithWorkspace([spec('a'), spec('b')], [specTab('a'), specTab('b')]);
    const dispatch = runThunks(getState);

    await thunk({ uid: 'a' })(dispatch, getState);

    expect(dispatch).toHaveBeenCalledWith(closeTabs({ tabUids: [specTab('a').uid], reopenable: false }));
    expect(dispatch).toHaveBeenCalledWith(removeApiSpec({ uid: 'a' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'test/loadWorkspaceApiSpecs', uid: 'ws1' });
  });

  it('closes no tab when the removed spec is not open', async () => {
    const getState = () => stateWithWorkspace([spec('a'), spec('b')], [specTab('b')]);
    const dispatch = runThunks(getState);

    await thunk({ uid: 'a' })(dispatch, getState);

    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: closeTabs.type }));
    expect(dispatch).toHaveBeenCalledWith(removeApiSpec({ uid: 'a' }));
  });

  it('changes nothing in state when IPC fails', async () => {
    window.ipcRenderer.invoke.mockRejectedValue(new Error('EACCES'));
    const getState = () => stateWithWorkspace([spec('a')], [specTab('a')]);
    const dispatch = runThunks(getState);

    await expect(thunk({ uid: 'a' })(dispatch, getState)).rejects.toThrow('EACCES');

    expect(dispatch).not.toHaveBeenCalledWith(removeApiSpec({ uid: 'a' }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: closeTabs.type }));
  });

  it('rejects without calling IPC when the spec is not loaded', async () => {
    await expect(thunk({ uid: 'missing' })(jest.fn(), () => stateWithWorkspace([]))).rejects.toThrow('API Spec not found');

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
