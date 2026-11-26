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

const COLLECTION_CONFIG_FILES = ['opencollection.yml', 'bruno.json'];

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

// Only opens the user starts are recorded, so each such open path calls this itself.
// Opens Bruno makes on its own are left out on purpose: restoring the last session, loading a workspace and the onboarding sample.
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

const isNearestFolderNonEmpty = async (folderPath) => {
  try {
    return (await fs.readdir(folderPath)).length > 0;
  } catch (error) {
    const parentPath = path.dirname(folderPath);
    return isMissingPathError(error) && parentPath !== folderPath && isNearestFolderNonEmpty(parentPath);
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

const isInsideFolder = (filePath, folderPath) => filePath.startsWith(`${folderPath}${path.posix.sep}`);

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

const toRealPath = async (folderPath) => {
  try {
    return await fs.realpath(folderPath);
  } catch (error) {
    const parentPath = path.dirname(folderPath);
    if (!isMissingPathError(error) || parentPath === folderPath) {
      throw error;
    }
    return path.posix.join(await toRealPath(parentPath), path.basename(folderPath));
  }
};

const getHomeFolder = async () => {
  try {
    return await fs.realpath(process.env.SNAP_REAL_HOME || os.homedir());
  } catch {
    return null;
  }
};

const isVolumeReachable = async (collectionPath) => {
  try {
    if (await isBehindMissingLink(path.dirname(collectionPath))) {
      return false;
    }
    if (process.platform === 'win32') {
      return (await fs.readdir(path.win32.parse(collectionPath).root)).length > 0;
    }
    const realPath = await toRealPath(collectionPath);
    const volumeRoot = VOLUME_ROOT_PATTERNS[process.platform]?.exec(realPath)?.[0];
    if (volumeRoot) {
      return (await fs.readdir(volumeRoot)).length > 0;
    }
    const mountFolder = MOUNT_FOLDERS[process.platform]?.find((folderPath) => isInsideFolder(realPath, folderPath));
    if (mountFolder) {
      return await isMountedBelow(mountFolder, path.dirname(realPath));
    }
    const homeFolder = await getHomeFolder();
    return await isNearestFolderNonEmpty(homeFolder && isInsideFolder(realPath, homeFolder) ? homeFolder : path.dirname(realPath));
  } catch {
    return false;
  }
};

const isConfigFileMissing = (collectionPath, fileName) =>
  fs.lstat(path.join(collectionPath, fileName)).then(() => false, isMissingPathError);

const isCollectionGone = async (collectionPath) => {
  try {
    if (!(await fs.lstat(collectionPath)).isDirectory()) {
      return true;
    }
    const missing = await Promise.all(COLLECTION_CONFIG_FILES.map((fileName) => isConfigFileMissing(collectionPath, fileName)));
    return missing.every(Boolean);
  } catch (error) {
    return isMissingPathError(error) && isVolumeReachable(collectionPath);
  }
};

const forgetMissingRecentCollections = async (paths) => {
  const gone = await Promise.all(paths.map(isCollectionGone));
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
