jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

jest.mock('./file-index', () => ({
  FileIndex: jest.fn().mockImplementation(() => ({
    entries: () => new Map(),
    status: async () => ({ added: [], updated: [], removed: [] }),
    stage: jest.fn(),
    transaction: (fn) => fn(),
    clear: jest.fn(),
    clearCollection: jest.fn(),
    close: jest.fn()
  }))
}));
jest.mock('../pool', () => ({
  JobType: {},
  getPool: jest.fn(),
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
