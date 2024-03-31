const { ipcMain } = require('electron');
const { getLastSelectedEnvironment, updateLastSelectedEnvironment } = require('../store/last-selected-environments');

const registerEnvironmentsIpc = (_mainWindow, _watcher) => {
  ipcMain.handle('renderer:get-last-selected-environment', async (_event, collectionUid) => {
    try {
      const environmentName = getLastSelectedEnvironment(collectionUid);
      return environmentName;
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:update-last-selected-environment', async (_event, collectionUid, environmentName) => {
    try {
      updateLastSelectedEnvironment(collectionUid, environmentName);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerEnvironmentsIpc;
