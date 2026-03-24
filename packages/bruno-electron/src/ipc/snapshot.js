const { ipcMain } = require('electron');
const snapshotManager = require('../services/snapshot');

const registerSnapshotIpc = () => {
  // Reads
  ipcMain.handle('renderer:snapshot:get', async () => {
    return snapshotManager.getSnapshot();
  });

  ipcMain.handle('renderer:snapshot:get-active-workspace', async () => {
    return snapshotManager.getActiveWorkspacePath();
  });

  ipcMain.handle('renderer:snapshot:get-workspace', async (event, pathname) => {
    return snapshotManager.getWorkspace(pathname);
  });

  ipcMain.handle('renderer:snapshot:get-collection', async (event, pathname) => {
    return snapshotManager.getCollection(pathname);
  });

  ipcMain.handle('renderer:snapshot:get-tabs', async (event, collectionPathname) => {
    return snapshotManager.getTabs(collectionPathname);
  });

  // Writes
  ipcMain.handle('renderer:snapshot:save', async (event, data) => {
    return snapshotManager.saveSnapshot(data);
  });

  ipcMain.handle('renderer:snapshot:set-active-workspace', async (event, pathname) => {
    return snapshotManager.setActiveWorkspacePath(pathname);
  });

  ipcMain.handle('renderer:snapshot:set-workspace', async (event, pathname, data) => {
    return snapshotManager.setWorkspace(pathname, data);
  });

  ipcMain.handle('renderer:snapshot:set-collection', async (event, pathname, data) => {
    return snapshotManager.setCollection(pathname, data);
  });

  ipcMain.handle('renderer:snapshot:set-tabs', async (event, collectionPathname, data) => {
    return snapshotManager.setTabs(collectionPathname, data);
  });

  ipcMain.handle('renderer:snapshot:remove-workspace', async (event, pathname) => {
    return snapshotManager.removeWorkspace(pathname);
  });

  ipcMain.handle('renderer:snapshot:remove-collection', async (event, pathname) => {
    return snapshotManager.removeCollection(pathname);
  });
};

module.exports = registerSnapshotIpc;
