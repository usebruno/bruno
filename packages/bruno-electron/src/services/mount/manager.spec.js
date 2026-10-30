jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

const mockPrefs = { searchIndexEnabled: false };
jest.mock('../../store/preferences', () => ({
  preferencesUtil: { isSearchIndexEnabled: () => mockPrefs.searchIndexEnabled }
}));

const mockSearchIndex = { transaction: (fn) => fn() };
jest.mock('../search-index', () => ({
  getSearchIndex: () => mockSearchIndex
}));

const mockIngest = jest.fn();
jest.mock('../search-index/ingest', () => ({
  ingestParsedFile: (...args) => mockIngest(...args),
  removeFromSearchIndex: jest.fn()
}));

const mockStatus = { added: [], updated: [], removed: [] };
jest.mock('./file-index', () => ({
  FileIndex: jest.fn().mockImplementation(() => ({
    entries: () => new Map(),
    status: async () => mockStatus,
    stage: jest.fn(),
    transaction: (fn) => fn(),
    clear: jest.fn(),
    clearCollection: jest.fn(),
    close: jest.fn()
  }))
}));
const mockRun = jest.fn();
jest.mock('../pool', () => ({
  JobType: { ParseFile: 'parse-file' },
  JobPriority: { search: 1, index: 3, mount: 5 },
  getPool: () => ({ run: mockRun }),
  destroyPool: jest.fn(async () => {})
}));

const mockCloseForCollection = jest.fn();
jest.mock('../../ipc/network/ws-event-handlers', () => ({
  getWsClient: () => ({ closeForCollection: mockCloseForCollection })
}));

const mockRemoveWatcher = jest.fn();
jest.mock('../../app/collection-watcher', () => ({
  addWatcher: jest.fn(),
  addTempDirectoryWatcher: jest.fn(),
  removeWatcher: (...args) => mockRemoveWatcher(...args)
}));

jest.mock('../../cache/requestUids', () => ({
  getRequestUid: (collectionPath, relativePath) => `${collectionPath}:${relativePath}`
}));

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { MountManager } = require('./manager');

const mountCollection = async (manager, collectionUid = 'col-1') => {
  const collectionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-mount-'));
  const win = {};
  const emit = { tree: jest.fn(), loading: jest.fn(), config: jest.fn() };
  await manager.mount({
    win,
    collectionPath,
    collectionUid,
    brunoConfig: {},
    emit
  });
  return { collectionPath, win };
};

describe('MountManager.unmount', () => {
  beforeEach(() => {
    mockCloseForCollection.mockReset();
    mockRemoveWatcher.mockReset();
  });

  it('closes websocket connections even when the collection was never v2-mounted', async () => {
    const manager = new MountManager();

    await manager.unmount('col-1');

    expect(mockCloseForCollection).toHaveBeenCalledWith('col-1');
    expect(mockRemoveWatcher).not.toHaveBeenCalled();
  });

  it('removes the watcher when unmounting a mounted collection', async () => {
    const manager = new MountManager();
    const { collectionPath, win } = await mountCollection(manager);

    await manager.unmount('col-1');

    expect(mockCloseForCollection).toHaveBeenCalledWith('col-1');
    expect(mockRemoveWatcher).toHaveBeenCalledWith(collectionPath, win, 'col-1');
  });

  it('still removes the watcher if closeForCollection throws', async () => {
    mockCloseForCollection.mockImplementation(() => {
      throw new Error('ws down');
    });
    const manager = new MountManager();
    const { collectionPath, win } = await mountCollection(manager);

    await expect(manager.unmount('col-1')).resolves.toBeUndefined();
    expect(mockRemoveWatcher).toHaveBeenCalledWith(collectionPath, win, 'col-1');
  });
});

describe('MountManager reconcile', () => {
  afterEach(() => {
    mockPrefs.searchIndexEnabled = false;
    mockStatus.added = [];
    mockRun.mockReset();
    mockIngest.mockReset();
  });

  it('parses changed files at mount priority and writes them to the search index', async () => {
    mockPrefs.searchIndexEnabled = true;
    mockStatus.added = [{ relativePath: 'req.bru' }];
    mockRun.mockResolvedValue({ relativePath: 'req.bru', mtime: 1n, hash: 'h', data: { name: 'Req' } });

    const manager = new MountManager();
    const { collectionPath } = await mountCollection(manager);

    expect(mockRun).toHaveBeenCalledWith('parse-file', expect.objectContaining({ relativePath: 'req.bru' }), { priority: 5 });
    expect(mockIngest).toHaveBeenCalledWith(expect.objectContaining({
      searchIndex: mockSearchIndex,
      collectionPath,
      result: expect.objectContaining({ relativePath: 'req.bru' })
    }));
  });
});
