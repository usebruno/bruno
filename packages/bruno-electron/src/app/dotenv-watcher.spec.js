const mockWatcher = {
  on: jest.fn(() => mockWatcher),
  close: jest.fn()
};

jest.mock('chokidar', () => ({
  watch: jest.fn(() => mockWatcher)
}));

jest.mock('@usebruno/filestore', () => ({
  parseDotEnv: jest.fn(() => ({}))
}), { virtual: true });

jest.mock('../store/process-env', () => ({
  setDotEnvVars: jest.fn(),
  clearDotEnvVars: jest.fn(),
  setWorkspaceDotEnvVars: jest.fn(),
  clearWorkspaceDotEnvVars: jest.fn()
}));

const chokidar = require('chokidar');
const dotEnvWatcher = require('./dotenv-watcher');

// Off the WSL share chokidar keeps its own default, so the option is left unset
const expectPolling = (watchPath, usePolling) => {
  const [calledPath, options] = chokidar.watch.mock.calls[0];
  expect(calledPath).toBe(watchPath);
  expect(options.usePolling).toBe(usePolling ? true : undefined);
};

const win = { isDestroyed: () => false, webContents: { send: jest.fn() } };

describe('DotEnvWatcher polling', () => {
  afterEach(() => {
    dotEnvWatcher.closeAll();
    jest.clearAllMocks();
  });

  it.each([
    ['\\\\wsl.localhost\\Ubuntu\\home\\user\\collection', true],
    ['//wsl.localhost/Ubuntu/home/user/collection', true],
    ['C:\\Users\\user\\collection', false],
    ['/home/user/collection', false]
  ])('collection watcher on %s polls: %s', (collectionPath, usePolling) => {
    dotEnvWatcher.addCollectionWatcher(win, collectionPath, 'collection-uid');

    expectPolling(collectionPath, usePolling);
  });

  it.each([
    ['\\\\wsl.localhost\\Ubuntu\\home\\user\\workspace', true],
    ['/home/user/workspace', false]
  ])('workspace watcher on %s polls: %s', (workspacePath, usePolling) => {
    dotEnvWatcher.addWorkspaceWatcher(win, workspacePath, 'workspace-uid');

    expectPolling(workspacePath, usePolling);
  });
});
