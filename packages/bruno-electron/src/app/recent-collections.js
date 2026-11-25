const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const recentCollections = require('../services/recent-collections');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('./collections');

const VOLUME_ROOT_PATTERNS = {
  darwin: /^\/Volumes\/[^/]+/,
  linux: /^\/run\/user\/\d+\/gvfs\/[^/]+/
};

const MOUNT_FOLDERS = {
  linux: ['/media', '/run/media', '/mnt']
};

let _mainWindow = null;
let isChangeQueued = false;

const sendRecentCollectionsChanged = () => {
  if (isChangeQueued) {
    return;
  }
  isChangeQueued = true;
  setImmediate(() => {
    isChangeQueued = false;
    if (_mainWindow && !_mainWindow.isDestroyed()) {
      _mainWindow.webContents.send('main:recent-collections-changed');
    }
  });
};

const sendIfChanged = (hasChanged) => {
  if (hasChanged) {
    sendRecentCollectionsChanged();
  }
};

const recordRecentCollections = (collections, lastEvent) => sendIfChanged(recentCollections.record(collections, lastEvent));

const forgetRecentCollections = (paths) => sendIfChanged(recentCollections.forget(paths));

const moveRecentCollection = (fromPath, toPath) => sendIfChanged(recentCollections.move(fromPath, toPath));

const renameRecentCollection = (collectionPath, name) => sendIfChanged(recentCollections.rename(collectionPath, name));

const recordRecentCollectionClose = async (collectionPath, name) => {
  const collectionStats = await fs.lstat(collectionPath).catch(() => null);
  if (!collectionStats?.isSymbolicLink()) {
    recordRecentCollections([{ path: collectionPath, name }], 'closed');
  }
};

const isMissingPathError = (error) => ['ENOENT', 'ENOTDIR'].includes(error.code);

const isNearestFolderInUse = async (folderPath) => {
  try {
    return (await fs.readdir(folderPath)).length > 0;
  } catch (error) {
    const parentPath = path.dirname(folderPath);
    return isMissingPathError(error) && parentPath !== folderPath && isNearestFolderInUse(parentPath);
  }
};

const isBehindMissingLink = async (folderPath) => {
  try {
    return (await fs.lstat(folderPath)).isSymbolicLink() && !(await fs.stat(folderPath).catch(() => null));
  } catch (error) {
    const parentPath = path.dirname(folderPath);
    return isMissingPathError(error) && parentPath !== folderPath && isBehindMissingLink(parentPath);
  }
};

const isInsideFolder = (filePath, folderPath) => filePath.startsWith(`${folderPath}${path.sep}`);

const isMountPoint = async (folderPath) => {
  const [folderStats, parentStats] = await Promise.all([fs.stat(folderPath), fs.stat(path.dirname(folderPath))]);
  return folderStats.dev !== parentStats.dev;
};

const isMountedBelow = async (mountFolder, folderPath) => {
  if (!isInsideFolder(folderPath, mountFolder)) {
    return false;
  }
  try {
    return (await isMountPoint(folderPath)) || isMountedBelow(mountFolder, path.dirname(folderPath));
  } catch (error) {
    return isMissingPathError(error) && isMountedBelow(mountFolder, path.dirname(folderPath));
  }
};

const isVolumeReachable = async (collectionPath) => {
  try {
    if (await isBehindMissingLink(path.dirname(collectionPath))) {
      return false;
    }
    const volumeRoot = process.platform === 'win32'
      ? path.win32.parse(collectionPath).root
      : VOLUME_ROOT_PATTERNS[process.platform]?.exec(collectionPath)?.[0];
    if (volumeRoot) {
      return (await fs.readdir(volumeRoot)).length > 0;
    }
    const mountFolder = MOUNT_FOLDERS[process.platform]?.find((folderPath) => isInsideFolder(collectionPath, folderPath));
    if (mountFolder) {
      return await isMountedBelow(mountFolder, path.dirname(collectionPath));
    }
    const homeFolder = os.homedir();
    return await isNearestFolderInUse(isInsideFolder(collectionPath, homeFolder) ? homeFolder : path.dirname(collectionPath));
  } catch {
    return false;
  }
};

const isFolderGone = async (collectionPath) => {
  try {
    return !(await fs.lstat(collectionPath)).isDirectory();
  } catch (error) {
    return isMissingPathError(error) && isVolumeReachable(collectionPath);
  }
};

const forgetMissingRecentCollections = async (paths) => {
  const gone = await Promise.all(paths.map(isFolderGone));
  forgetRecentCollections(paths.filter((_collectionPath, index) => gone[index]));
};

const openCollectionFromRecentMenu = async (win, watcher, collectionPath) => {
  const result = await openCollection(win, watcher, collectionPath);
  if (!result.opened) {
    await forgetMissingRecentCollections([collectionPath]);
  } else if (isDirectory(collectionPath)) {
    recordRecentCollections([{ path: collectionPath, name: result.name }], 'opened');
  }
};

const setRecentCollectionsWindow = (mainWindow) => {
  _mainWindow = mainWindow;
};

module.exports = {
  recordRecentCollections,
  forgetRecentCollections,
  forgetMissingRecentCollections,
  moveRecentCollection,
  renameRecentCollection,
  recordRecentCollectionClose,
  openCollectionFromRecentMenu,
  isVolumeReachable,
  setRecentCollectionsWindow
};
