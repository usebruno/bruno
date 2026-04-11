const { ipcMain } = require('electron');
const mockServer = require('../app/mock-server');

const registerMockServerIpc = (mainWindow) => {
  mockServer.setMainWindow(mainWindow);

  ipcMain.handle('renderer:mock-server-start', async (_event, { collectionUid, collectionPath, port, globalDelay }) => {
    try {
      const result = await mockServer.start(collectionUid, collectionPath, port, globalDelay);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-stop', async (_event, { collectionUid }) => {
    try {
      await mockServer.stop(collectionUid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-status', async (_event, { collectionUid }) => {
    return mockServer.getStatus(collectionUid);
  });

  ipcMain.handle('renderer:mock-server-refresh-routes', async (_event, { collectionUid }) => {
    try {
      const result = mockServer.refreshRoutes(collectionUid);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-get-routes', async (_event, { collectionUid }) => {
    return mockServer.getRoutes(collectionUid);
  });

  ipcMain.handle('renderer:mock-server-get-log', async (_event, { collectionUid }) => {
    return mockServer.getLog(collectionUid);
  });

  ipcMain.handle('renderer:mock-server-set-delay', async (_event, { collectionUid, delay }) => {
    try {
      mockServer.setDelay(collectionUid, delay);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-clear-log', async (_event, { collectionUid }) => {
    mockServer.clearLog(collectionUid);
    return { success: true };
  });

  ipcMain.on('main:start-quit-flow', () => {
    mockServer.stopAll().catch((err) => {
      console.error('[MockServer] Error stopping servers on quit:', err.message);
    });
  });
};

module.exports = registerMockServerIpc;
