const { ipcMain } = require('electron');
const mockServer = require('../app/mock-server');

const registerMockServerIpc = (mainWindow) => {
  mockServer.setMainWindow(mainWindow);

  ipcMain.handle('renderer:mock-server-suggest-port', async () => {
    try {
      const port = await mockServer.suggestPort();
      return { success: true, port, mode: mockServer.getMockMode() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-start', async (_event, payload) => {
    try {
      const result = await mockServer.start(payload);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-stop', async (_event, { mockServerUid, collectionUid }) => {
    try {
      await mockServer.stop(mockServerUid || collectionUid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-status', async (_event, { mockServerUid, collectionUid }) => {
    return mockServer.getStatus(mockServerUid || collectionUid);
  });

  ipcMain.handle('renderer:mock-server-refresh-routes', async (_event, { mockServerUid, collectionUid }) => {
    try {
      const result = await mockServer.refreshRoutes(mockServerUid || collectionUid);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-get-routes', async (_event, { mockServerUid, collectionUid }) => {
    return mockServer.getRoutes(mockServerUid || collectionUid);
  });

  ipcMain.handle('renderer:mock-server-get-log', async (_event, { mockServerUid, collectionUid }) => {
    return mockServer.getLog(mockServerUid || collectionUid);
  });

  ipcMain.handle('renderer:mock-server-set-delay', async (_event, { mockServerUid, collectionUid, delay }) => {
    try {
      mockServer.setDelay(mockServerUid || collectionUid, delay);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-clear-log', async (_event, { mockServerUid, collectionUid }) => {
    mockServer.clearLog(mockServerUid || collectionUid);
    return { success: true };
  });

  ipcMain.handle('renderer:mock-server-get-running', async () => {
    return mockServer.getRunningMockServerUids();
  });

  ipcMain.handle('renderer:mock-server-sync-state', async (_event, { mockServerUid, collectionUid }) => {
    const uid = mockServerUid || collectionUid;
    return {
      status: mockServer.getStatus(uid),
      routes: mockServer.getRoutes(uid),
      log: mockServer.getLog(uid)
    };
  });

  ipcMain.on('main:start-quit-flow', () => {
    mockServer.stopAll().catch((err) => {
      console.error('[MockServer] Error stopping servers on quit:', err.message);
    });
  });
};

module.exports = registerMockServerIpc;
