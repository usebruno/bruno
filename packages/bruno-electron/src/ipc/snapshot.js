const { ipcMain } = require('electron');
const snapshotManager = require('../services/snapshot');

const registerSnapshotIpc = () => {
  ipcMain.handle('renderer:snapshot:get', async () => {
    return snapshotManager.getSnapshot();
  });

  ipcMain.handle('renderer:snapshot:get-tabs', async (event, collectionPathname, workspacePathname) => {
    return snapshotManager.getTabs(collectionPathname, workspacePathname);
  });

  ipcMain.handle('renderer:snapshot:get-collection', async (event, collectionPathname, workspacePathname) => {
    return snapshotManager.getCollection(collectionPathname, workspacePathname);
  });

  ipcMain.handle('renderer:snapshot:get-sidebar', async () => {
    return snapshotManager.getSidebar();
  });

  ipcMain.handle('renderer:snapshot:get-workspace', async (event, workspacePathname) => {
    return snapshotManager.getWorkspaceSnapshot(workspacePathname);
  });

  ipcMain.on('internal:snapshot:reset', () => {
    try {
      snapshotManager.resetSnapshot();
    } catch (err) {
      // digest error if reset fails
    }
  });

  ipcMain.handle('renderer:snapshot:save', async (event, data) => {
    if (
      data
      && (Array.isArray(data.workspaces)
        || Array.isArray(data.collections)
        || 'revision' in data
        || Array.isArray(data.removeWorkspaces)
        || Array.isArray(data.removeCollections))
    ) {
      return snapshotManager.mergeSnapshot(data);
    }

    return snapshotManager.saveSnapshot(data);
  });
};

module.exports = registerSnapshotIpc;
