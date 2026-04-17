jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
  custom: jest.fn()
}));

jest.mock('components/Errors/IpcErrorModal/index', () => () => null);

const toast = require('react-hot-toast');
const { importCollectionFromZip } = require('./actions');

describe('importCollectionFromZip', () => {
  beforeEach(() => {
    window.ipcRenderer = {
      invoke: jest.fn()
    };
  });

  afterEach(() => {
    delete window.ipcRenderer;
    jest.clearAllMocks();
  });

  it('shows the formatted IPC error when ZIP import fails', async () => {
    const error = new Error(
      'Error invoking remote method \'renderer:import-collection-zip\': Error: Security error: Symlink "boilerplate.js" points outside extraction directory'
    );

    window.ipcRenderer.invoke.mockRejectedValue(error);

    const thunk = importCollectionFromZip('/tmp/collection.zip', '/tmp/imports');
    const getState = () => ({
      workspaces: {
        workspaces: [{ uid: 'default-workspace', type: 'default', pathname: '/tmp/workspace' }],
        activeWorkspaceUid: 'default-workspace'
      }
    });

    await expect(thunk(jest.fn(), getState)).rejects.toThrow(error);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:import-collection-zip',
      '/tmp/collection.zip',
      '/tmp/imports'
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Security error: Symlink "boilerplate.js" points outside extraction directory'
    );
  });
});
