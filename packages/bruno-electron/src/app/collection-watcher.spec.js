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

const filesystem = require('../utils/filesystem');
const { parseFileMeta } = require('../utils/collection');
const { parseRequest, parseRequestViaWorker } = require('@usebruno/filestore');
const { getBrunoConfig } = require('../store/bruno-config');
const collectionWatcher = require('./collection-watcher');

describe('CollectionWatcher', () => {
  afterEach(() => {
    collectionWatcher.closeAllWatchers();
    Object.keys(watcherHandlers).forEach((event) => delete watcherHandlers[event]);
    filesystem.hasRequestExtension.mockImplementation((pathname) => pathname.endsWith('.bru'));
    filesystem.getCollectionFormat.mockReturnValue('bru');
    parseRequest.mockReset();
    parseRequestViaWorker.mockReset();
    parseFileMeta.mockReset();
    jest.clearAllMocks();
  });

  const flushSetImmediate = () => new Promise((resolve) => setImmediate(resolve));

  const flushUntil = async (predicate, maxTurns = 40) => {
    for (let i = 0; i < maxTurns; i++) {
      if (predicate()) {
        return;
      }
      await flushSetImmediate();
    }
    throw new Error('timed out waiting for watcher drain');
  };

  const loadingEvents = (win) => win.webContents.send.mock.calls
    .filter(([channel]) => channel === 'main:collection-loading-state-updated')
    .map(([, payload]) => payload);

  const addFilePayloads = (win) => win.addFileSnapshots || win.webContents.send.mock.calls
    .filter(([channel, action]) => channel === 'main:collection-tree-updated' && action === 'addFile')
    .map(([, , payload]) => payload);

  const createWin = () => {
    const addFileSnapshots = [];
    const win = {
      addFileSnapshots,
      webContents: {
        send: jest.fn((channel, action, payload) => {
          if (channel === 'main:collection-tree-updated' && action === 'addFile') {
            addFileSnapshots.push(JSON.parse(JSON.stringify(payload)));
          }
        })
      }
    };
    return win;
  };

  const mockReadableRequest = (content = 'request-content') => {
    jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 100 });
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(content);
  };

  const restoreFsPromises = () => {
    if (jest.isMockFunction(fs.promises.stat)) {
      fs.promises.stat.mockRestore();
    }
    if (jest.isMockFunction(fs.promises.readFile)) {
      fs.promises.readFile.mockRestore();
    }
  };

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

  it('clears loading when ready fires with no pending request files', async () => {
    const watchPath = path.join('tmp', 'empty-pending-collection');
    const collectionUid = 'collection-uid';
    const win = { webContents: { send: jest.fn() } };

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.ready();

    expect(loadingEvents(win)).toEqual(expect.arrayContaining([
      { collectionUid, isLoading: true },
      { collectionUid, isLoading: false }
    ]));

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
  });

  it('clears loading when the last pending request file is processed', async () => {
    const watchPath = path.join('tmp', 'last-pending-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };

    mockReadableRequest();
    parseRequest.mockResolvedValue({ name: 'Get', type: 'http-request' });

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);
    watcherHandlers.ready();

    await flushUntil(() => loadingEvents(win).some((event) => event.isLoading === false));

    expect(loadingEvents(win).some((event) => event.isLoading === false)).toBe(true);

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    restoreFsPromises();
  });

  it('sends a partial error item when parse fails after a successful read', async () => {
    const watchPath = path.join('tmp', 'parse-fail-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };

    mockReadableRequest('bad content');
    parseRequest.mockRejectedValue(new Error('parse failed'));

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);

    await flushUntil(() => addFilePayloads(win).some((payload) => payload.error));

    expect(addFilePayloads(win).pop()).toEqual(expect.objectContaining({
      error: { message: 'parse failed' },
      partial: true,
      loading: false
    }));

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    restoreFsPromises();
  });

  it('sends partial then loading then full items on the worker parse path', async () => {
    const watchPath = path.join('tmp', 'worker-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = createWin();
    const content = 'request-content';

    mockReadableRequest(content);
    parseFileMeta.mockReturnValue({ name: 'Get', type: 'http-request' });
    parseRequestViaWorker.mockResolvedValue({ name: 'Get Users', type: 'http-request' });

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {}, false, true);
    watcherHandlers.add(requestPath);

    await flushUntil(() => addFilePayloads(win).length >= 3);

    expect(addFilePayloads(win)).toEqual([
      expect.objectContaining({ partial: true, loading: false }),
      expect.objectContaining({ partial: false, loading: true }),
      expect.objectContaining({
        partial: false,
        loading: false,
        data: expect.objectContaining({
          name: 'Get Users',
          raw: content
        })
      })
    ]);
    expect(parseRequestViaWorker).toHaveBeenCalledWith(content, { format: 'bru' });

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    restoreFsPromises();
  });

  it('sends a partial error item when worker parse fails after a successful read', async () => {
    const watchPath = path.join('tmp', 'worker-parse-fail-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };

    mockReadableRequest('request-content');
    parseFileMeta.mockReturnValue({ name: 'Get', type: 'http-request' });
    parseRequestViaWorker.mockRejectedValue(new Error('worker parse failed'));

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {}, false, true);
    watcherHandlers.add(requestPath);

    await flushUntil(() => addFilePayloads(win).some((payload) => payload.error));

    expect(addFilePayloads(win).pop()).toEqual(expect.objectContaining({
      error: { message: 'worker parse failed' },
      partial: true,
      loading: false
    }));

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    restoreFsPromises();
  });

  it('parses yml request files through the add path', async () => {
    const watchPath = path.join('tmp', 'yml-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.yml');
    const win = { webContents: { send: jest.fn() } };
    const content = 'yml-request-content';

    filesystem.getCollectionFormat.mockReturnValue('yml');
    filesystem.hasRequestExtension.mockImplementation((pathname) => pathname.endsWith('.yml'));
    mockReadableRequest(content);
    parseRequest.mockResolvedValue({ name: 'Yml Get', type: 'http-request' });

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);

    await flushUntil(() => addFilePayloads(win).length > 0);

    expect(parseRequest).toHaveBeenCalledWith(content, { format: 'yml' });
    expect(addFilePayloads(win).pop()).toEqual(expect.objectContaining({
      partial: false,
      loading: false,
      data: expect.objectContaining({
        name: 'Yml Get',
        raw: content
      })
    }));

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    restoreFsPromises();
  });

  it('does not emit loading false after unmount while a request add is in-flight', async () => {
    const watchPath = path.join('tmp', 'unmount-mid-mount-collection');
    const collectionUid = 'collection-uid';
    const requestPath = path.join(watchPath, 'get.bru');
    const win = { webContents: { send: jest.fn() } };
    let resolveRead;

    jest.spyOn(fs.promises, 'stat').mockResolvedValue({ size: 100 });
    jest.spyOn(fs.promises, 'readFile').mockImplementation(() => new Promise((resolve) => {
      resolveRead = resolve;
    }));
    parseRequest.mockResolvedValue({ name: 'Get', type: 'http-request' });

    collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
    watcherHandlers.add(requestPath);
    watcherHandlers.ready();

    expect(loadingEvents(win).some((event) => event.isLoading === false)).toBe(false);

    collectionWatcher.removeWatcher(watchPath, win, collectionUid);
    resolveRead('request-content');
    await flushSetImmediate();
    await flushSetImmediate();
    await flushSetImmediate();

    expect(loadingEvents(win).some((event) => event.isLoading === false)).toBe(false);

    restoreFsPromises();
  });
});
