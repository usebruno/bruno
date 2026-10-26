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
  watch: jest.fn((watchPath, options) => {
    return mockWatcher;
  })
}));

jest.mock('../utils/filesystem', () => ({
  hasRequestExtension: jest.fn((pathname) => pathname.endsWith('.bru')),
  isWSLPath: jest.fn(() => false),
  normalizeAndResolvePath: jest.fn((pathname) => pathname),
  sizeInMB: jest.fn(),
  getCollectionFormat: jest.fn(() => 'bru')
}));

jest.mock('@usebruno/filestore', () => ({
  parseEnvironment: jest.fn(),
  parseRequest: jest.fn(),
  parseRequestViaWorker: jest.fn(),
  parseCollection: jest.fn(),
  parseFolder: jest.fn()
}), { virtual: true });

jest.mock('@usebruno/common/utils', () => ({
  parseValueByDataType: jest.fn()
}), { virtual: true });

jest.mock('../utils/common', () => ({
  uuid: jest.fn(() => 'uuid')
}));

jest.mock('../cache/requestUids', () => ({
  getRequestUid: jest.fn()
}));

jest.mock('../utils/encryption', () => ({
  decryptStringSafe: jest.fn()
}));

jest.mock('../store/env-secrets', () => jest.fn().mockImplementation(() => ({})));

jest.mock('../services/snapshot', () => ({
  getCollection: jest.fn()
}));

jest.mock('../utils/collection', () => ({
  parseFileMeta: jest.fn(),
  hydrateRequestWithUuid: jest.fn()
}));

jest.mock('../utils/parse', () => ({
  parseLargeRequestWithRedaction: jest.fn()
}));

jest.mock('../utils/transformBrunoConfig', () => ({
  transformBrunoConfigAfterRead: jest.fn()
}));

jest.mock('./dotenv-watcher', () => ({
  addCollectionWatcher: jest.fn(),
  removeCollectionWatcher: jest.fn()
}));

const { getBrunoConfig } = require('../store/bruno-config');
const collectionWatcher = require('./collection-watcher');

describe('CollectionWatcher', () => {
  afterEach(() => {
    collectionWatcher.closeAllWatchers();
    Object.keys(watcherHandlers).forEach((event) => delete watcherHandlers[event]);
    jest.clearAllMocks();
  });

  it('honors configured ignore paths during the initial scan', () => {
    const watchPath = path.join('tmp', 'collection');
    const collectionUid = 'collection-uid';
    const brunoConfig = { ignore: ['ignored'] };
    const win = { webContents: { send: jest.fn() } };

    collectionWatcher.addWatcher(win, watchPath, collectionUid, brunoConfig);

    expect(getBrunoConfig(collectionUid)).toEqual(brunoConfig);

    const ignored = require('chokidar').watch.mock.calls[0][1].ignored;
    const ignoredDir = path.join(watchPath, 'ignored', 'somefile.yml');
    const visibleDir = path.join(watchPath, 'visible', 'somefile.yml');
    const gitDir = path.join(watchPath, '.git', 'config');
    const nodeModulesDir = path.join(watchPath, 'node_modules', 'package', 'index.js');

    expect(ignored(ignoredDir)).toBe(true);
    expect(ignored(visibleDir)).toBe(false);
    expect(ignored(gitDir)).toBe(true);
    expect(ignored(nodeModulesDir)).toBe(true);
  });

  const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

  const loadingEvents = (win) => win.webContents.send.mock.calls
    .filter(([channel]) => channel === 'main:collection-loading-state-updated')
    .map(([, payload]) => payload);

  it('keeps loading true when ready fires before a queued request is processed', async () => {
    const watchPath = path.join('tmp', 'pending-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };

    jest.spyOn(fs.promises, 'stat').mockImplementation(() => new Promise(() => {}));
    jest.spyOn(fs.promises, 'readFile').mockImplementation(() => new Promise(() => {}));

    collectionWatcher.startCollectionDiscovery(win, collectionUid);
    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);
    watcherHandlers.ready();

    expect(loadingEvents(win).some((event) => event.isLoading === false)).toBe(false);

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    fs.promises.stat.mockRestore();
    fs.promises.readFile.mockRestore();
  });

  it('sends a partial error item when a request file cannot be read', async () => {
    const watchPath = path.join('tmp', 'read-fail-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };
    const { parseRequestViaWorker } = require('@usebruno/filestore');

    jest.spyOn(fs.promises, 'stat').mockRejectedValue(new Error('ENOENT'));
    jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('ENOENT'));

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);
    await flushSetImmediate();
    await flushSetImmediate();

    expect(win.webContents.send).toHaveBeenCalledWith(
      'main:collection-tree-updated',
      'addFile',
      expect.objectContaining({
        error: { message: 'ENOENT' },
        partial: true,
        loading: false
      })
    );
    expect(parseRequestViaWorker).not.toHaveBeenCalled();

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    fs.promises.stat.mockRestore();
    fs.promises.readFile.mockRestore();
  });

  it('does not start queued files after the watcher is removed', async () => {
    const watchPath = path.join('tmp', 'removed-collection');
    const collectionUid = 'collection-uid';
    const win = { webContents: { send: jest.fn() } };

    jest.spyOn(fs.promises, 'stat').mockImplementation(() => new Promise(() => {}));
    jest.spyOn(fs.promises, 'readFile').mockImplementation(() => new Promise(() => {}));

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(path.join(watchPath, 'one.bru'));
    watcherHandlers.add(path.join(watchPath, 'two.bru'));
    watcherHandlers.add(path.join(watchPath, 'three.bru'));

    expect(fs.promises.stat).toHaveBeenCalledTimes(1);

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    await flushSetImmediate();
    await flushSetImmediate();

    expect(fs.promises.stat).toHaveBeenCalledTimes(1);

    fs.promises.stat.mockRestore();
    fs.promises.readFile.mockRestore();
  });
});
