const os = require('node:os');
const path = require('node:path');

jest.mock('electron', () => ({
  app: { getPath: () => require('node:os').tmpdir() }
}));

jest.mock('../../app/collection-watcher', () => ({
  addWatcher: jest.fn(),
  addTempDirectoryWatcher: jest.fn(),
  removeWatcher: jest.fn()
}));

jest.mock('./file-index', () => ({
  FileIndex: jest.fn().mockImplementation(() => ({
    entries: jest.fn(() => new Map()),
    status: jest.fn(async () => ({ added: [], updated: [], removed: [] })),
    transaction: jest.fn((fn) => fn()),
    stage: jest.fn(),
    clear: jest.fn(),
    close: jest.fn(),
    dbPath: require('node:path').join(require('node:os').tmpdir(), 'mount-index.db')
  }))
}));

jest.mock('../pool', () => ({
  JobType: { ParseFile: 'ParseFile' },
  getPool: jest.fn(() => ({ run: jest.fn() })),
  destroyPool: jest.fn(async () => {})
}));

jest.mock('./tree-builder', () => ({
  buildTree: jest.fn(() => ({ items: [], environments: [] }))
}));

jest.mock('../../utils/mount', () => ({
  defaultClassify: jest.fn(() => null),
  uidForSeed: jest.fn((seed) => `uid-${seed}`)
}));

jest.mock('../../cache/requestUids', () => ({
  getRequestUid: jest.fn(() => 'request-uid')
}));

const { MountManager } = require('./manager');
const collectionWatcher = require('../../app/collection-watcher');

const makeEmit = () => ({ loading: jest.fn(), tree: jest.fn(), config: jest.fn() });

const mountCollection = async (manager, { collectionUid = 'col-1', brunoConfig = {} } = {}) => {
  const win = { id: 1 };
  const emit = makeEmit();
  const collectionPath = path.join(os.tmpdir(), collectionUid);
  const tempDirectoryPath = await manager.mount({ win, collectionPath, collectionUid, brunoConfig, emit });
  return { win, emit, collectionPath: path.resolve(collectionPath), tempDirectoryPath };
};

describe('MountManager.remount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reattaches the cache-backed watcher and re-emits the tree', async () => {
    const manager = new MountManager();
    const { win, emit, collectionPath, tempDirectoryPath } = await mountCollection(manager, {
      collectionUid: 'col-1',
      brunoConfig: { format: 'bru' }
    });
    jest.clearAllMocks();

    const result = await manager.remount({ collectionUid: 'col-1', brunoConfig: { format: 'yml' } });

    expect(result).toBe(true);
    expect(collectionWatcher.removeWatcher).toHaveBeenCalledWith(collectionPath, win, 'col-1');

    expect(collectionWatcher.addWatcher).toHaveBeenCalledTimes(1);
    const addWatcherArgs = collectionWatcher.addWatcher.mock.calls[0];
    expect(addWatcherArgs[0]).toBe(win);
    expect(addWatcherArgs[1]).toBe(collectionPath);
    expect(addWatcherArgs[2]).toBe('col-1');
    expect(addWatcherArgs[3]).toEqual({ format: 'yml' });
    expect(addWatcherArgs[6]).toEqual(expect.objectContaining({ ignoreInitial: true }));
    expect(addWatcherArgs[6].fileIndex).toBeTruthy();

    // the transient directory is preserved so the renderer's stored path stays valid
    expect(collectionWatcher.addTempDirectoryWatcher).toHaveBeenCalledWith(win, tempDirectoryPath, 'col-1', collectionPath);

    expect(emit.tree).toHaveBeenCalledTimes(1);
    expect(emit.loading).toHaveBeenNthCalledWith(1, true);
    expect(emit.loading).toHaveBeenLastCalledWith(false);
  });

  it('returns false and does no lifecycle work for an unmounted collection', async () => {
    const manager = new MountManager();

    const result = await manager.remount({ collectionUid: 'never-mounted' });

    expect(result).toBe(false);
    expect(collectionWatcher.removeWatcher).not.toHaveBeenCalled();
    expect(collectionWatcher.addWatcher).not.toHaveBeenCalled();
    expect(collectionWatcher.addTempDirectoryWatcher).not.toHaveBeenCalled();
  });

  it('propagates a watcher-removal failure without reattaching', async () => {
    const manager = new MountManager();
    await mountCollection(manager, { collectionUid: 'col-1' });
    jest.clearAllMocks();

    collectionWatcher.removeWatcher.mockImplementationOnce(() => {
      throw new Error('removeWatcher failed');
    });

    await expect(manager.remount({ collectionUid: 'col-1' })).rejects.toThrow('removeWatcher failed');
    expect(collectionWatcher.addWatcher).not.toHaveBeenCalled();
  });
});
