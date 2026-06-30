const { ipcMain } = require('electron');
const snapshotManager = require('../services/snapshot');

const registerSnapshotIpc = () => {
  ipcMain.handle('renderer:snapshot:get', async () => {
    return snapshotManager.getSnapshot();
  });

  ipcMain.handle('renderer:snapshot:get-tabs', async (event, collectionPathname, workspacePathname) => {
    return snapshotManager.getTabs(collectionPathname, workspacePathname);
  });

  ipcMain.on('internal:snapshot:reset', () => {
    try {
      snapshotManager.resetSnapshot();
    } catch (err) {
      // digest error if reset fails
    }
  });

  ipcMain.handle('renderer:snapshot:save', async (event, data, saveToken) => {
    return snapshotManager.saveSnapshot(data, saveToken);
  });
};

module.exports = registerSnapshotIpc;
