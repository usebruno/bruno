const fs = require('node:fs/promises');
const os = require('node:os');
const { app, ipcMain, utilityProcess } = require('electron');
const { getPreferences } = require('../store/preferences');
const { defaultWorkspaceManager } = require('../store/default-workspace');
const LastOpenedWorkspaces = require('../store/last-opened-workspaces');
const recentCollections = require('../services/recent-collections');
const { transientManager } = require('../services/transient');
const { CollectionScanner } = require('../services/collection-scan');
const { buildScanLocations } = require('../services/collection-scan/locations');

const MAX_SCAN_ID_LENGTH = 100;
const KNOWN_FOLDER_NAMES = ['desktop', 'documents', 'downloads'];

let collectionScanner = null;

const isScanId = (scanId) => typeof scanId === 'string' && scanId.length > 0 && scanId.length <= MAX_SCAN_ID_LENGTH;

const isFolder = (folderPath) => fs.stat(folderPath).then((stats) => stats.isDirectory(), () => false);

const readHomePath = () => (process.platform === 'linux' && process.env.SNAP_REAL_HOME) || os.homedir();

const readKnownFolders = () => KNOWN_FOLDER_NAMES.map((name) => app.getPath(name));

const readSystemRoot = () => (process.platform === 'win32' ? `${process.env.SystemDrive || 'C:'}\\` : '/');

const readScanLocations = () => buildScanLocations({
  preferences: getPreferences(),
  documentsPath: app.getPath('documents'),
  defaultWorkspacePath: defaultWorkspaceManager.getDefaultWorkspacePath(),
  lastOpenedWorkspacePaths: new LastOpenedWorkspaces().getAll(),
  homePath: readHomePath(),
  systemRoot: readSystemRoot(),
  isFolder
});

const readRecents = () => {
  try {
    return recentCollections.list().map(({ path, name }) => ({ path, name }));
  } catch (error) {
    return [];
  }
};

const readExcludedPaths = () => [transientManager.getRootDirectory()];

const startCollectionScan = async (request) => {
  const { scanId } = request || {};
  if (!isScanId(scanId)) {
    throw new Error('A collection scan needs a scan id');
  }
  return collectionScanner.start(scanId);
};

const cancelCollectionScan = (request) => {
  const { scanId } = request || {};
  collectionScanner.cancel(scanId);
};

const stopCollectionScan = () => {
  collectionScanner?.stop();
};

const registerCollectionScanIpc = (mainWindow) => {
  collectionScanner = new CollectionScanner({
    fork: (...args) => utilityProcess.fork(...args),
    send: (channel, payload) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
      }
    },
    readLocations: readScanLocations,
    readRecents,
    readExcludedPaths,
    readHomePath,
    readKnownFolders
  });
  ipcMain.handle('renderer:collection-scan:start', (_event, request) => startCollectionScan(request));
  ipcMain.handle('renderer:collection-scan:cancel', (_event, request) => cancelCollectionScan(request));
  mainWindow.webContents.on('did-navigate', stopCollectionScan);
  mainWindow.webContents.on('render-process-gone', stopCollectionScan);
};

module.exports = {
  startCollectionScan,
  cancelCollectionScan,
  stopCollectionScan,
  registerCollectionScanIpc
};
