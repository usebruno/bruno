jest.mock('node:fs/promises', () => ({ readdir: jest.fn(), lstat: jest.fn(), stat: jest.fn() }));
jest.mock('node:os', () => ({ homedir: jest.fn() }));
jest.mock('../services/recent-collections', () => ({
  record: jest.fn(),
  forget: jest.fn(),
  move: jest.fn(),
  rename: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({ isDirectory: jest.fn() }));
jest.mock('./collections', () => ({ openCollection: jest.fn() }));

const path = require('node:path');
const { readdir, lstat, stat } = require('node:fs/promises');
const { homedir } = require('node:os');
const recentCollections = require('../services/recent-collections');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('./collections');
const {
  recordRecentCollections,
  forgetRecentCollections,
  forgetMissingRecentCollections,
  moveRecentCollection,
  renameRecentCollection,
  recordRecentCollectionClose,
  openCollectionFromRecentMenu,
  isVolumeReachable,
  setRecentCollectionsWindow
} = require('./recent-collections');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

const onPlatform = (platform) => Object.defineProperty(process, 'platform', { value: platform });

const fsError = (code) => Object.assign(new Error(code), { code });

const waitForBroadcast = () => new Promise((resolve) => setImmediate(resolve));

const onFolders = (devices) => {
  const statOf = (folderPath) => {
    if (devices[folderPath] === undefined) {
      throw fsError('ENOENT');
    }
    return { dev: devices[folderPath] };
  };
  stat.mockImplementation(async (folderPath) => statOf(folderPath));
  readdir.mockImplementation(async (folderPath) => {
    statOf(folderPath);
    return Object.keys(devices).filter((other) => path.dirname(other) === folderPath).map((other) => path.basename(other));
  });
};

describe('recent collections', () => {
  let mainWindow;

  beforeEach(() => {
    jest.resetAllMocks();
    mainWindow = { isDestroyed: jest.fn(() => false), webContents: { send: jest.fn() } };
    readdir.mockResolvedValue(['orders']);
    lstat.mockRejectedValue(fsError('ENOENT'));
    stat.mockRejectedValue(fsError('ENOENT'));
    homedir.mockReturnValue('/home/me');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
  });

  it('tells the window once per tick that recent collections changed', async () => {
    setRecentCollectionsWindow(mainWindow);
    recentCollections.record.mockReturnValue(true);
    recentCollections.forget.mockReturnValue(true);
    recentCollections.move.mockReturnValue(true);
    recentCollections.rename.mockReturnValue(true);

    recordRecentCollections([{ path: '/projects/orders', name: 'Orders API' }], 'opened');
    forgetRecentCollections(['/projects/users']);
    moveRecentCollection('/projects/orders', '/workspace/collections/orders');
    renameRecentCollection('/workspace/collections/orders', 'Orders');
    await waitForBroadcast();

    expect(recentCollections.record).toHaveBeenCalledWith([{ path: '/projects/orders', name: 'Orders API' }], 'opened');
    expect(recentCollections.forget).toHaveBeenCalledWith(['/projects/users']);
    expect(recentCollections.move).toHaveBeenCalledWith('/projects/orders', '/workspace/collections/orders');
    expect(recentCollections.rename).toHaveBeenCalledWith('/workspace/collections/orders', 'Orders');
    expect(mainWindow.webContents.send.mock.calls).toEqual([['main:recent-collections-changed']]);

    recordRecentCollections([{ path: '/projects/users' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(2);
  });

  it('tells the window nothing when nothing changed', async () => {
    setRecentCollectionsWindow(mainWindow);
    recentCollections.record.mockReturnValue(false);

    recordRecentCollections([{ path: '/projects/orders' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('tells a closed window nothing', async () => {
    setRecentCollectionsWindow(mainWindow);
    mainWindow.isDestroyed.mockReturnValue(true);
    recentCollections.record.mockReturnValue(true);

    recordRecentCollections([{ path: '/projects/orders' }], 'closed');
    await waitForBroadcast();

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it('records a close under the name the window sends', async () => {
    lstat.mockResolvedValue({ isSymbolicLink: () => false });

    await recordRecentCollectionClose('/projects/orders', 'Orders API');

    expect(recentCollections.record).toHaveBeenCalledWith([{ path: '/projects/orders', name: 'Orders API' }], 'closed');
  });

  it('records the close of a collection whose folder is gone or on a drive that is unplugged', async () => {
    await recordRecentCollectionClose('/Volumes/USB/orders', 'Orders API');

    expect(recentCollections.record).toHaveBeenCalledWith([{ path: '/Volumes/USB/orders', name: 'Orders API' }], 'closed');
  });

  it('records nothing for a collection opened through a link, even one whose folder is gone', async () => {
    lstat.mockResolvedValue({ isSymbolicLink: () => true });

    await recordRecentCollectionClose('/projects/orders-link', 'Orders API');

    expect(recentCollections.record).not.toHaveBeenCalled();
  });

  describe('openCollectionFromRecentMenu', () => {
    const watcher = {};

    it('opens the collection and records it in Recents', async () => {
      openCollection.mockResolvedValue({ opened: true, name: 'Orders API' });
      isDirectory.mockReturnValue(true);

      await openCollectionFromRecentMenu(mainWindow, watcher, '/projects/orders');

      expect(openCollection).toHaveBeenCalledWith(mainWindow, watcher, '/projects/orders');
      expect(recentCollections.record).toHaveBeenCalledWith([{ path: '/projects/orders', name: 'Orders API' }], 'opened');
    });

    it('opens a link to a collection folder without recording the link', async () => {
      openCollection.mockResolvedValue({ opened: true, name: 'Orders API' });
      isDirectory.mockReturnValue(false);

      await openCollectionFromRecentMenu(mainWindow, watcher, '/projects/orders-link');

      expect(recentCollections.record).not.toHaveBeenCalled();
    });

    it('records nothing and forgets nothing when the folder holds no collection', async () => {
      openCollection.mockResolvedValue({ opened: false });
      lstat.mockResolvedValue({ isDirectory: () => true });

      await openCollectionFromRecentMenu(mainWindow, watcher, '/projects/notes');

      expect(recentCollections.record).not.toHaveBeenCalled();
      expect(recentCollections.forget).toHaveBeenCalledWith([]);
    });

    it('forgets a collection whose folder is gone', async () => {
      onPlatform('linux');
      openCollection.mockResolvedValue({ opened: false });

      await openCollectionFromRecentMenu(mainWindow, watcher, '/home/me/orders');

      expect(recentCollections.forget).toHaveBeenCalledWith(['/home/me/orders']);
    });
  });

  it.each([
    ['win32', 'D:\\work\\orders', 'D:\\'],
    ['win32', '\\\\server\\share\\orders', '\\\\server\\share\\'],
    ['darwin', '/Volumes/USB Drive/orders', '/Volumes/USB Drive'],
    ['darwin', '/Users/me/orders', '/Users/me'],
    ['linux', '/run/user/1000/gvfs/smb-share:server=nas,share=team/apis/orders', '/run/user/1000/gvfs/smb-share:server=nas,share=team'],
    ['linux', '/home/me/orders', '/home/me'],
    ['linux', '/home/me/projects/orders', '/home/me'],
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
    onPlatform('darwin');
    readdir.mockResolvedValue(entries);

    await expect(isVolumeReachable('/Volumes/USB/orders')).resolves.toBe(isReachable);
    expect(readdir).toHaveBeenCalledWith('/Volumes/USB');
  });

  it.each([
    ['a drive mounted for a user under /media', '/media/me/USB/orders', { '/media': 1, '/media/me': 1, '/media/me/USB': 2 }],
    ['a drive mounted straight under /media', '/media/data/orders', { '/media': 1, '/media/data': 2 }],
    ['a drive mounted for a user under /run/media', '/run/media/me/USB/orders', { '/run/media': 1, '/run/media/me': 1, '/run/media/me/USB': 2 }],
    ['a drive mounted under /mnt', '/mnt/data/orders', { '/mnt': 1, '/mnt/data': 2 }],
    ['a share mounted deeper under /mnt', '/mnt/nas/projects/orders', { '/mnt': 1, '/mnt/nas': 1, '/mnt/nas/projects': 2 }],
    ['a folder inside a share mounted under /mnt', '/mnt/nas/projects/orders', { '/mnt': 1, '/mnt/nas': 2, '/mnt/nas/projects': 2 }]
  ])('on linux reports %s as reachable', async (_label, collectionPath, devices) => {
    onPlatform('linux');
    onFolders(devices);

    await expect(isVolumeReachable(collectionPath)).resolves.toBe(true);
  });

  it.each([
    ['an unplugged drive whose mount point is gone', '/media/me/USB/orders', { '/media': 1, '/media/me': 1 }],
    ['an unmounted drive under /media', '/media/data/orders', { '/media': 1, '/media/data': 1 }],
    ['an unmounted share deeper under /mnt', '/mnt/nas/projects/orders', { '/mnt': 1, '/mnt/nas': 1, '/mnt/nas/projects': 1 }]
  ])('on linux reports %s as unreachable', async (_label, collectionPath, devices) => {
    onPlatform('linux');
    onFolders(devices);

    await expect(isVolumeReachable(collectionPath)).resolves.toBe(false);
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

    expect(recentCollections.forget).toHaveBeenCalledWith(['/Users/me/deleted']);
  });

  it('keeps a collection on a mount point outside the known folders while it is unmounted', async () => {
    onPlatform('linux');
    readdir.mockImplementation(async (folderPath) => (folderPath === '/srv/apis' ? [] : ['srv']));

    await forgetMissingRecentCollections(['/srv/apis/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith([]);
  });

  it('judges a missing folder by the nearest folder above it that still exists', async () => {
    onPlatform('linux');
    readdir.mockImplementation(async (folderPath) => {
      if (folderPath === '/srv/old-project') {
        throw fsError('ENOENT');
      }
      return ['notes'];
    });

    await forgetMissingRecentCollections(['/srv/old-project/api']);

    expect(readdir).toHaveBeenCalledWith('/srv');
    expect(recentCollections.forget).toHaveBeenCalledWith(['/srv/old-project/api']);
  });

  it('forgets a collection deleted from a folder in the home folder that it leaves empty', async () => {
    onPlatform('linux');
    readdir.mockImplementation(async (folderPath) => (folderPath === '/home/me/bruno-collections' ? [] : ['bruno-collections']));

    await forgetMissingRecentCollections(['/home/me/bruno-collections/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith(['/home/me/bruno-collections/orders']);
  });

  it('keeps a collection behind a link to a drive that is unplugged', async () => {
    onPlatform('linux');
    lstat.mockImplementation(async (filePath) => {
      if (filePath === '/home/me/Projects') {
        return { isSymbolicLink: () => true, isDirectory: () => false };
      }
      throw fsError('ENOENT');
    });

    await forgetMissingRecentCollections(['/home/me/Projects/orders', '/home/me/Projects/team/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith([]);
  });

  it('forgets a collection deleted behind a link whose drive is connected', async () => {
    onPlatform('linux');
    lstat.mockImplementation(async (filePath) => {
      if (filePath === '/home/me/Projects') {
        return { isSymbolicLink: () => true, isDirectory: () => false };
      }
      throw fsError('ENOENT');
    });
    stat.mockResolvedValue({ isDirectory: () => true });
    readdir.mockResolvedValue(['billing']);

    await forgetMissingRecentCollections(['/home/me/Projects/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith(['/home/me/Projects/orders']);
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

    expect(recentCollections.forget).toHaveBeenCalledWith(['/Users/me/notes.txt/orders']);
  });

  it.each(['EACCES', 'EPERM'])('keeps a folder it is not allowed to look at (%s), as it may still be there', async (code) => {
    onPlatform('darwin');
    lstat.mockRejectedValue(fsError(code));

    await forgetMissingRecentCollections(['/Users/me/Documents/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith([]);
  });

  it('keeps a folder that exists', async () => {
    onPlatform('darwin');
    lstat.mockResolvedValue({ isDirectory: () => true });

    await forgetMissingRecentCollections(['/Users/me/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith([]);
  });

  it('forgets a path that now holds a file or a link, which an open never accepts', async () => {
    onPlatform('darwin');
    lstat.mockResolvedValue({ isDirectory: () => false });

    await forgetMissingRecentCollections(['/Users/me/orders']);

    expect(recentCollections.forget).toHaveBeenCalledWith(['/Users/me/orders']);
  });
});
