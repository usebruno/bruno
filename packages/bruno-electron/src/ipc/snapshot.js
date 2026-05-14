const { ipcMain } = require('electron');
const snapshotManager = require('../services/snapshot');

const registerSnapshotIpc = () => {
  ipcMain.handle('renderer:snapshot:get', async () => {
    return snapshotManager.getSnapshot();
  });

  ipcMain.handle('renderer:snapshot:get-tabs', async (event, collectionPathname, workspacePathname) => {
    return snapshotManager.getTabs(collectionPathname, workspacePathname);
  });

  ipcMain.handle('renderer:snapshot:save', async (event, data) => {
    return snapshotManager.saveSnapshot(data);
  });
};

module.exports = registerSnapshotIpc;
