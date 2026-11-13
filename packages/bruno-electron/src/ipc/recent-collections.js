const fs = require('node:fs/promises');
const path = require('node:path');
const { ipcMain } = require('electron');
const { recentCollectionsStore } = require('../store/recent-collections');

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

const recordRecentCollections = (collections, lastEvent) => sendIfChanged(recentCollectionsStore.record(collections, lastEvent));

const forgetRecentCollections = (paths) => sendIfChanged(recentCollectionsStore.forget(paths));

const moveRecentCollection = (fromPath, toPath) => sendIfChanged(recentCollectionsStore.move(fromPath, toPath));

const renameRecentCollection = (collectionPath, name) => sendIfChanged(recentCollectionsStore.rename(collectionPath, name));

const isVolumeReachable = async (collectionPath) => {
  try {
    const volumeRoot = process.platform === 'win32'
      ? path.win32.parse(collectionPath).root
      : VOLUME_ROOT_PATTERNS[process.platform]?.exec(collectionPath)?.[0] ?? '/';
    return (await fs.readdir(volumeRoot)).length > 0;
  } catch {
    return false;
  }
};

const isFolderGone = async (collectionPath) => {
  try {
    return !(await fs.lstat(collectionPath)).isDirectory();
  } catch (error) {
    return ['ENOENT', 'ENOTDIR'].includes(error.code) && isVolumeReachable(collectionPath);
  }
};

const forgetMissingRecentCollections = async (paths) => {
  const gone = await Promise.all(paths.map(isFolderGone));
  forgetRecentCollections(paths.filter((_collectionPath, index) => gone[index]));
};

const getRecentCollections = () => recentCollectionsStore.list();

const registerRecentCollectionsIpc = (mainWindow) => {
  _mainWindow = mainWindow;
  ipcMain.handle('renderer:get-recent-collections', () => getRecentCollections());
};

module.exports = {
  getRecentCollections,
  recordRecentCollections,
  forgetRecentCollections,
  forgetMissingRecentCollections,
  moveRecentCollection,
  renameRecentCollection,
  isVolumeReachable,
  registerRecentCollectionsIpc
};
