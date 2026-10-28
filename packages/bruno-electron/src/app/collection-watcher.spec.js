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
  hasRequestExtension: jest.fn(),
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

jest.mock('../services/search-index/watcher-stage', () => ({
  stageParsedToSearchIndex: jest.fn(),
  removeFromSearchIndexPath: jest.fn()
}));

const fs = require('fs');
const os = require('os');
const { getBrunoConfig } = require('../store/bruno-config');
const { hasRequestExtension } = require('../utils/filesystem');
const { parseRequest } = require('@usebruno/filestore');
const collectionWatcher = require('./collection-watcher');

const treeUpdates = (send) => send.mock.calls.filter(([channel]) => channel === 'main:collection-tree-updated');

const deliveredFilePaths = (send) => treeUpdates(send).flatMap(([, type, payload]) => {
  if (type === 'addFile') return [payload.meta.pathname];
  if (type === 'addBatch') return payload.filter((event) => event.type === 'addFile').map((event) => event.payload.meta.pathname);
  return [];
});

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

  describe('initial scan', () => {
    const collectionUid = 'collection-uid';
    let watchPath;
    let filePaths;

    beforeEach(() => {
      watchPath = fs.mkdtempSync(path.join(os.tmpdir(), 'collection-watcher-'));
      filePaths = Array.from({ length: 50 }, (_, i) => path.join(watchPath, `req-${i}.bru`));
      filePaths.forEach((filePath) => fs.writeFileSync(filePath, 'meta {}'));
      hasRequestExtension.mockReturnValue(true);
      parseRequest.mockImplementation(async () => ({ name: 'req', type: 'http-request' }));
    });

    afterEach(() => {
      fs.rmSync(watchPath, { recursive: true, force: true });
    });

    it('delivers the scanned files in order over a bounded number of messages, ahead of a later change', async () => {
      const win = { webContents: { send: jest.fn() } };
      collectionWatcher.addWatcher(win, watchPath, collectionUid, {});

      for (const filePath of filePaths) {
        await watcherHandlers.add(filePath);
      }
      await watcherHandlers.change(filePaths[0]);
      watcherHandlers.ready();

      const updates = treeUpdates(win.webContents.send);
      expect(updates.length).toBeLessThanOrEqual(5);
      expect(deliveredFilePaths(win.webContents.send)).toEqual(filePaths);
      expect(updates[updates.length - 1][1]).toBe('change');
    });

    it('delivers all scanned files before reporting the collection as loaded', async () => {
      const win = { webContents: { send: jest.fn() } };
      collectionWatcher.addWatcher(win, watchPath, collectionUid, {});

      for (const filePath of filePaths) {
        await watcherHandlers.add(filePath);
      }
      watcherHandlers.ready();

      const channels = win.webContents.send.mock.calls.map(([channel]) => channel);
      const loadedAt = win.webContents.send.mock.calls.findIndex(
        ([channel, val]) => channel === 'main:collection-loading-state-updated' && val.isLoading === false
      );
      expect(loadedAt).toBeGreaterThan(channels.lastIndexOf('main:collection-tree-updated'));
      expect(deliveredFilePaths(win.webContents.send)).toEqual(filePaths);
    });

    it('sends a file added after the scan as a single addFile', async () => {
      const win = { webContents: { send: jest.fn() } };
      collectionWatcher.addWatcher(win, watchPath, collectionUid, {});
      watcherHandlers.ready();
      win.webContents.send.mockClear();

      await watcherHandlers.add(filePaths[0]);

      expect(treeUpdates(win.webContents.send)).toEqual([
        ['main:collection-tree-updated', 'addFile', expect.objectContaining({ meta: expect.objectContaining({ pathname: filePaths[0] }) })]
      ]);
    });
  });
});
