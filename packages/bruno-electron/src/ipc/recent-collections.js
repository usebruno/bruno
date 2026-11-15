const fs = require('node:fs/promises');
const path = require('node:path');
const recentCollections = require('../services/recent-collections');

const VOLUME_ROOT_PATTERNS = {
  darwin: /^\/Volumes\/[^/]+/,
  linux: /^\/(?:media\/[^/]+|run\/media\/[^/]+|run\/user\/\d+\/gvfs|mnt)\/[^/]+/
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

const isVolumeReachable = async (collectionPath) => {
  try {
    if (await isBehindMissingLink(path.dirname(collectionPath))) {
      return false;
    }
    const volumeRoot = process.platform === 'win32'
      ? path.win32.parse(collectionPath).root
      : VOLUME_ROOT_PATTERNS[process.platform]?.exec(collectionPath)?.[0];
    return volumeRoot ? (await fs.readdir(volumeRoot)).length > 0 : await isNearestFolderInUse(path.dirname(collectionPath));
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
  isVolumeReachable,
  setRecentCollectionsWindow
};
