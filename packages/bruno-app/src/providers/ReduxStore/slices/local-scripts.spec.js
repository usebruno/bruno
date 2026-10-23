import localScriptsReducer, {
  localScriptsLoadedEvent,
  loadLocalScripts,
  saveLocalScripts
} from 'providers/ReduxStore/slices/local-scripts';

beforeAll(() => {
  window.ipcRenderer = { invoke: jest.fn() };
});

const commands = [{ name: 'get-jwt', command: 'node get-jwt.js', timeout: 60000 }];

describe('local-scripts slice', () => {
  it('defaults to no commands', () => {
    expect(localScriptsReducer(undefined, { type: 'noop' })).toEqual({ commands: [] });
  });

  it('hydrates from the main-process event and mirrors to the codemirror layer', async () => {
    const dispatch = jest.fn();
    await localScriptsLoadedEvent({ commands })(dispatch);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'local-scripts/localScriptsUpdated',
        payload: { commands }
      })
    );
    const state = localScriptsReducer(undefined, dispatch.mock.calls[0][0]);
    expect(state).toEqual({ commands });
  });

  it('fetches the registry through IPC', async () => {
    window.ipcRenderer.invoke.mockResolvedValueOnce({ commands });
    const dispatch = jest.fn();
    const result = await loadLocalScripts()(dispatch);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:get-local-scripts');
    expect(result).toEqual({ commands });
    expect(dispatch).toHaveBeenCalled();
  });

  it('saves the registry through IPC and updates state', async () => {
    window.ipcRenderer.invoke.mockResolvedValueOnce({ commands });
    const dispatch = jest.fn();
    const result = await saveLocalScripts(commands)(dispatch);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:save-local-scripts', {
      config: { commands }
    });
    expect(result).toEqual({ commands });
    expect(dispatch).toHaveBeenCalled();
  });
});
