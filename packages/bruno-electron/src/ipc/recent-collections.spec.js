jest.mock('node:fs/promises', () => ({ readdir: jest.fn(), lstat: jest.fn() }));
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() }
}));
jest.mock('../store/recent-collections', () => ({
  recentCollectionsStore: {
    list: jest.fn(),
    record: jest.fn(),
    forget: jest.fn(),
    move: jest.fn(),
    rename: jest.fn()
  }
}));

const { readdir, lstat } = require('node:fs/promises');
const { ipcMain } = require('electron');
const { recentCollectionsStore } = require('../store/recent-collections');
const {
  getRecentCollections,
  recordRecentCollections,
  forgetRecentCollections,
  forgetMissingRecentCollections,
  moveRecentCollection,
  renameRecentCollection,
  isVolumeReachable,
  registerRecentCollectionsIpc
} = require('./recent-collections');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const onPlatform = (platform) => Object.defineProperty(process, 'platform', { value: platform });

const fsError = (code) => Object.assign(new Error(code), { code });

const waitForBroadcast = () => new Promise((resolve) => setImmediate(resolve));

describe('recent collections IPC', () => {
  let mainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    mainWindow = { isDestroyed: jest.fn(() => false), webContents: { send: jest.fn() } };
    readdir.mockResolvedValue(['orders']);
    lstat.mockRejectedValue(fsError('ENOENT'));
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
  });

  it('registers the channel that lists recent collections', () => {
    recentCollectionsStore.list.mockReturnValue([]);

    registerRecentCollectionsIpc(mainWindow);

    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual(['renderer:get-recent-collections']);
    const [[, listRecentCollections]] = ipcMain.handle.mock.calls;
    expect(listRecentCollections({})).toEqual([]);
  });

  it('fails the list request when the stored rows cannot be read', () => {
    const readError = fsError('EACCES');
    recentCollectionsStore.list.mockImplementationOnce(() => {
      throw readError;
    });

    registerRecentCollectionsIpc(mainWindow);

    const [[, listRecentCollections]] = ipcMain.handle.mock.calls;
    expect(() => listRecentCollections({})).toThrow(readError);
  });

  it('lists the stored rows as they are, still listing a row whose folder is gone', () => {
    const rows = [
      { path: '/projects/orders', name: 'Orders API', usedAt: 2, lastEvent: 'opened' },
      { path: '/projects/deleted', name: 'Deleted API', usedAt: 1, lastEvent: 'closed' }
    ];
    recentCollectionsStore.list.mockReturnValue(rows);

    expect(getRecentCollections()).toEqual(rows);
    expect(lstat).not.toHaveBeenCalled();
    expect(readdir).not.toHaveBeenCalled();
  });

  it('tells the window once per tick that recent collections changed', async () => {
    registerRecentCollectionsIpc(mainWindow);
    recentCollectionsStore.record.mockReturnValue(true);
    recentCollectionsStore.forget.mockReturnValue(true);
    recentCollectionsStore.move.mockReturnValue(true);
    recentCollectionsStore.rename.mockReturnValue(true);

    recordRecentCollections([{ path: '/projects/orders', name: 'Orders API' }], 'opened');
    forgetRecentCollections(['/projects/users']);
    moveRecentCollection('/projects/orders', '/workspace/collections/orders');
    renameRecentCollection('/workspace/collections/orders', 'Orders');
    await waitForBroadcast();

    expect(recentCollectionsStore.record).toHaveBeenCalledWith([{ path: '/projects/orders', name: 'Orders API' }], 'opened');
    expect(recentCollectionsStore.forget).toHaveBeenCalledWith(['/projects/users']);
    expect(recentCollectionsStore.move).toHaveBeenCalledWith('/projects/orders', '/workspace/collections/orders');
    expect(recentCollectionsStore.rename).toHaveBeenCalledWith('/workspace/collections/orders', 'Orders');
    expect(mainWindow.webContents.send.mock.calls).toEqual([['main:recent-collections-changed']]);

    recordRecentCollections([{ path: '/projects/users' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(2);
  });

  it('tells the window nothing when nothing changed', async () => {
    registerRecentCollectionsIpc(mainWindow);
    recentCollectionsStore.record.mockReturnValue(false);

    recordRecentCollections([{ path: '/projects/orders' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('tells a closed window nothing', async () => {
    registerRecentCollectionsIpc(mainWindow);
    mainWindow.isDestroyed.mockReturnValue(true);
    recentCollectionsStore.record.mockReturnValue(true);

    recordRecentCollections([{ path: '/projects/orders' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it.each([
    ['win32', 'D:\\work\\orders', 'D:\\'],
    ['win32', '\\\\server\\share\\orders', '\\\\server\\share\\'],
    ['darwin', '/Volumes/USB Drive/orders', '/Volumes/USB Drive'],
    ['darwin', '/Users/me/orders', '/Users/me'],
    ['linux', '/media/me/USB/orders', '/media/me/USB'],
    ['linux', '/run/media/me/USB/orders', '/run/media/me/USB'],
    ['linux', '/run/user/1000/gvfs/smb-share:server=nas,share=team/apis/orders', '/run/user/1000/gvfs/smb-share:server=nas,share=team'],
    ['linux', '/mnt/data/orders', '/mnt/data'],
    ['linux', '/home/me/orders', '/home/me'],
    ['freebsd', '/usr/home/me/orders', '/usr/home/me']
  ])('on %s checks %s at %s', async (platform, collectionPath, volumeRoot) => {
    onPlatform(platform);

    await expect(isVolumeReachable(collectionPath)).resolves.toBe(true);
    expect(readdir).toHaveBeenCalledWith(volumeRoot);
  });

  it.each([
    ['an empty root, as an unplugged drive leaves its mount point, as unreachable', [], false],
    ['a root that lists entries as reachable', ['orders'], true]
  ])('reports a volume with %s', async (_label, entries, isReachable) => {
    onPlatform('linux');
    readdir.mockResolvedValue(entries);

    await expect(isVolumeReachable('/mnt/data/orders')).resolves.toBe(isReachable);
    expect(readdir).toHaveBeenCalledWith('/mnt/data');
  });

  it('reports a volume whose root cannot be read as unreachable', async () => {
    onPlatform('darwin');
    readdir.mockRejectedValue(fsError('ENOENT'));

    await expect(isVolumeReachable('/Volumes/USB Drive/orders')).resolves.toBe(false);
  });

  it('reports a path it cannot parse as unreachable instead of throwing', async () => {
    onPlatform('win32');

    await expect(isVolumeReachable(42)).resolves.toBe(false);
  });

  it('forgets a missing folder on a present volume and keeps one on a missing volume', async () => {
    onPlatform('darwin');
    readdir.mockImplementation(async (volumeRoot) => {
      if (volumeRoot === '/Volumes/USB Drive') {
        throw fsError('ENOENT');
      }
      return ['Users'];
    });

    await forgetMissingRecentCollections(['/Users/me/deleted', '/Volumes/USB Drive/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith(['/Users/me/deleted']);
  });

  it('keeps a collection on a mount point outside the known folders while it is unmounted', async () => {
    onPlatform('linux');
    readdir.mockImplementation(async (folderPath) => (folderPath === '/srv/apis' ? [] : ['srv']));

    await forgetMissingRecentCollections(['/srv/apis/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith([]);
  });

  it('judges a missing folder by the nearest folder above it that still exists', async () => {
    onPlatform('linux');
    readdir.mockImplementation(async (folderPath) => {
      if (folderPath === '/home/me/old-project') {
        throw fsError('ENOENT');
      }
      return ['notes'];
    });

    await forgetMissingRecentCollections(['/home/me/old-project/api']);

    expect(readdir).toHaveBeenCalledWith('/home/me');
    expect(recentCollectionsStore.forget).toHaveBeenCalledWith(['/home/me/old-project/api']);
  });

  it('forgets a folder whose path now runs through a file', async () => {
    onPlatform('darwin');
    lstat.mockRejectedValue(fsError('ENOTDIR'));
    readdir.mockImplementation(async (folderPath) => {
      if (folderPath === '/Users/me/notes.txt') {
        throw fsError('ENOTDIR');
      }
      return ['notes.txt'];
    });

    await forgetMissingRecentCollections(['/Users/me/notes.txt/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith(['/Users/me/notes.txt/orders']);
  });

  it.each(['EACCES', 'EPERM'])('keeps a folder it is not allowed to look at (%s), as it may still be there', async (code) => {
    onPlatform('darwin');
    lstat.mockRejectedValue(fsError(code));

    await forgetMissingRecentCollections(['/Users/me/Documents/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith([]);
  });

  it('keeps a folder that exists', async () => {
    onPlatform('darwin');
    lstat.mockResolvedValue({ isDirectory: () => true });

    await forgetMissingRecentCollections(['/Users/me/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith([]);
  });

  it('forgets a path that now holds a file or a link, which an open never accepts', async () => {
    onPlatform('darwin');
    lstat.mockResolvedValue({ isDirectory: () => false });

    await forgetMissingRecentCollections(['/Users/me/orders']);

    expect(recentCollectionsStore.forget).toHaveBeenCalledWith(['/Users/me/orders']);
  });
});
