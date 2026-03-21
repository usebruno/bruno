const { ipcMain } = require('electron');
const snapshotManager = require('../services/snapshot');

const registerSnapshotIpc = () => {
  ipcMain.handle('renderer:get-snapshot', async () => {
    return snapshotManager.getSnapshot();
  });

  ipcMain.handle('renderer:save-snapshot', async (event, data) => {
    return snapshotManager.saveSnapshot(data);
  });

  ipcMain.handle('renderer:get-workspace-snapshot', async (event, pathname) => {
    return snapshotManager.getWorkspace(pathname);
  });

  ipcMain.handle('renderer:get-collection-snapshot', async (event, pathname) => {
    return snapshotManager.getCollection(pathname);
  });
};

module.exports = registerSnapshotIpc;
