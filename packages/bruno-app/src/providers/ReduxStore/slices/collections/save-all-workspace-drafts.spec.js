jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

const toast = require('react-hot-toast');
const { saveAllWorkspaceDrafts } = require('providers/ReduxStore/slices/collections/actions');

const uid = (label) => label.padEnd(21, '0');

const request = (label, pathname, { edited = true, method = 'GET', isTransient = false } = {}) => {
  const base = {
    uid: uid(label),
    name: label,
    type: 'http-request',
    seq: 1,
    pathname,
    isTransient,
    request: {
      method: 'GET',
      url: 'https://example.com',
      headers: [],
      params: [],
      body: { mode: 'none' }
    }
  };

  return {
    ...base,
    draft: edited ? { ...base, request: { ...base.request, method, url: 'https://example.com/edited' } } : null
  };
};

const environment = { uid: uid('env'), name: 'Local', variables: [] };
const environmentVariables = [
  { uid: uid('var'), name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false }
];

const buildState = ({ collectionTwoRequest = request('r2', '/dev/two/r2.yml'), scratchItems = [], withSettingsDrafts = true } = {}) => ({
  workspaces: {
    activeWorkspaceUid: 'w1',
    workspaces: [
      { uid: 'w1', scratchCollectionUid: 'scratch', collections: [{ path: '/dev/one' }, { path: '/dev/two' }] }
    ]
  },
  collections: {
    tempDirectories: { scratch: '/tmp/scratch' },
    collections: [
      {
        uid: 'c1',
        name: 'one',
        pathname: '/dev/one',
        format: 'yml',
        root: {},
        brunoConfig: {},
        draft: withSettingsDrafts ? { root: { docs: 'edited docs' } } : null,
        environments: [environment],
        environmentsDraft: withSettingsDrafts ? { environmentUid: environment.uid, variables: environmentVariables } : null,
        items: [
          request('r1', '/dev/one/r1.yml'),
          {
            uid: uid('folder'),
            name: 'folder',
            type: 'folder',
            pathname: '/dev/one/folder',
            root: {},
            draft: withSettingsDrafts ? { docs: 'edited folder docs' } : null,
            items: []
          }
        ]
      },
      { uid: 'c2', name: 'two', pathname: '/dev/two', format: 'yml', root: {}, items: [collectionTwoRequest] },
      { uid: 'scratch', name: 'scratch', pathname: '/tmp/scratch', format: 'yml', root: {}, items: scratchItems }
    ]
  }
});

const run = async (state) => {
  const actions = [];
  const getState = () => state;
  const dispatch = (action) => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    actions.push(action);
    return action;
  };

  await dispatch(saveAllWorkspaceDrafts());
  await new Promise((resolve) => setTimeout(resolve, 0));

  return actions;
};

const invokedChannels = () => window.ipcRenderer.invoke.mock.calls.map(([channel]) => channel);
const savedRequestUids = (actions) =>
  actions.filter((action) => action.type === 'collections/saveRequest').map((action) => action.payload.itemUid);

describe('saveAllWorkspaceDrafts', () => {
  beforeEach(() => {
    window.ipcRenderer = { invoke: jest.fn().mockResolvedValue() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saves settings, environment and request drafts of every workspace collection', async () => {
    const actions = await run(buildState());

    expect(invokedChannels()).toEqual(expect.arrayContaining([
      'renderer:save-collection-root',
      'renderer:save-folder-root',
      'renderer:save-environment'
    ]));
    expect(invokedChannels().filter((channel) => channel === 'renderer:save-multiple-requests')).toHaveLength(2);
    expect(savedRequestUids(actions)).toEqual([uid('r1'), uid('r2')]);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Changes saved successfully');
  });

  it('keeps saving other collections when one collection fails to write', async () => {
    window.ipcRenderer.invoke.mockImplementation((channel, payload) =>
      channel === 'renderer:save-multiple-requests' && payload[0].pathname.startsWith('/dev/two')
        ? Promise.reject(new Error('disk full'))
        : Promise.resolve()
    );

    const actions = await run(buildState());

    expect(savedRequestUids(actions)).toEqual([uid('r1')]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to save requests!');
  });

  it('keeps saving other collections when one collection has an invalid request', async () => {
    const invalidRequest = request('r2', '/dev/two/r2.yml', { method: null });

    const actions = await run(buildState({ collectionTwoRequest: invalidRequest }));

    expect(savedRequestUids(actions)).toEqual([uid('r1')]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('skips the success toast when an environment fails to save', async () => {
    window.ipcRenderer.invoke.mockImplementation((channel) =>
      channel === 'renderer:save-environment' ? Promise.reject(new Error('denied')) : Promise.resolve()
    );

    const actions = await run(buildState());

    expect(savedRequestUids(actions)).toEqual([uid('r1'), uid('r2')]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to save environment');
  });

  it('opens the save dialog for an edited transient request without a success toast', async () => {
    const state = buildState({
      collectionTwoRequest: request('r2', '/dev/two/r2.yml', { edited: false }),
      scratchItems: [request('t1', '/tmp/scratch/Untitled 1.yml', { isTransient: true })],
      withSettingsDrafts: false
    });
    state.collections.collections[0].items[0] = request('r1', '/dev/one/r1.yml', { edited: false });

    const actions = await run(state);

    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(actions.filter((action) => action.type === 'collections/addSaveTransientRequestModal').map((action) => action.payload.item.uid))
      .toEqual([uid('t1')]);
  });
});
