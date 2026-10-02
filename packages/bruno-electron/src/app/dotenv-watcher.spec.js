const fs = require('fs');
const path = require('path');

const watcherHandlers = {};
const mockWatcher = {
  on: jest.fn((event, handler) => {
    watcherHandlers[event] = handler;
    return mockWatcher;
  }),
  close: jest.fn()
};

jest.mock('chokidar', () => ({
  watch: jest.fn(() => mockWatcher)
}));

jest.mock('@usebruno/filestore', () => ({
  parseDotEnv: jest.fn((content) => JSON.parse(content))
}), { virtual: true });

jest.mock('../store/process-env', () => ({
  setDotEnvVars: jest.fn(),
  clearDotEnvVars: jest.fn(),
  setWorkspaceDotEnvVars: jest.fn(),
  clearWorkspaceDotEnvVars: jest.fn()
}));

const { setDotEnvVars } = require('../store/process-env');
const dotEnvWatcher = require('./dotenv-watcher');

describe('DotEnvWatcher - FIFO .env handling (#6057)', () => {
  const collectionPath = path.join('tmp', 'collection');
  const envPath = path.join(collectionPath, '.env');
  let win;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(watcherHandlers).forEach((event) => delete watcherHandlers[event]);
    win = { isDestroyed: () => false, webContents: { send: jest.fn() } };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    dotEnvWatcher.removeCollectionWatcher(collectionPath);
  });

  it('reads a FIFO .env once on add but ignores subsequent change events', () => {
    jest.spyOn(fs, 'statSync').mockReturnValue({ isFIFO: () => true });
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{"KEY":"1"}');

    dotEnvWatcher.addCollectionWatcher(win, collectionPath, 'col-uid');

    watcherHandlers.add(envPath);
    expect(setDotEnvVars).toHaveBeenCalledTimes(1);

    watcherHandlers.change(envPath);
    watcherHandlers.change(envPath);
    expect(setDotEnvVars).toHaveBeenCalledTimes(1);
  });

  it('still re-reads a regular (non-FIFO) .env file on every change', () => {
    jest.spyOn(fs, 'statSync').mockReturnValue({ isFIFO: () => false });
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{"KEY":"1"}');

    dotEnvWatcher.addCollectionWatcher(win, collectionPath, 'col-uid');

    watcherHandlers.add(envPath);
    watcherHandlers.change(envPath);

    expect(setDotEnvVars).toHaveBeenCalledTimes(2);
  });
});
