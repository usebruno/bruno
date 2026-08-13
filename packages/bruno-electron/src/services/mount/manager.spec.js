jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));

jest.mock('./file-index', () => ({ FileIndex: jest.fn() }));
jest.mock('../pool', () => ({
  JobType: {},
  getPool: jest.fn(),
  destroyPool: jest.fn(async () => {})
}));

const mockCloseForCollection = jest.fn();
jest.mock('../../ipc/network/ws-event-handlers', () => ({
  get wsClient() {
    return { closeForCollection: mockCloseForCollection };
  }
}));

jest.mock('../../app/collection-watcher', () => ({
  removeWatcher: jest.fn()
}));

const { MountManager } = require('./manager');

describe('MountManager.unmount', () => {
  beforeEach(() => {
    mockCloseForCollection.mockClear();
  });

  it('closes websocket connections even when the collection was never v2-mounted', async () => {
    const manager = new MountManager();

    await manager.unmount('col-1');

    expect(mockCloseForCollection).toHaveBeenCalledWith('col-1');
  });

  it('still unmounts if closeForCollection throws', async () => {
    mockCloseForCollection.mockImplementation(() => {
      throw new Error('ws down');
    });
    const manager = new MountManager();

    await expect(manager.unmount('col-1')).resolves.toBeUndefined();
  });
});
