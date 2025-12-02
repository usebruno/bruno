const { ipcMain } = require('electron');
const { getPreferences, savePreferences, preferencesUtil } = require('../store/preferences');
const { globalEnvironmentsStore } = require('../store/global-environments');

const registerPreferencesIpc = (mainWindow, watcher) => {
  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

    // load system proxy vars
    const systemProxyVars = preferencesUtil.getSystemProxyEnvVariables();
    const { http_proxy, https_proxy, no_proxy } = systemProxyVars || {};
    mainWindow.webContents.send('main:load-system-proxy-env', { http_proxy, https_proxy, no_proxy });

    try {
      // load global environments
      const globalEnvironments = globalEnvironmentsStore.getGlobalEnvironments();
      let activeGlobalEnvironmentUid = globalEnvironmentsStore.getActiveGlobalEnvironmentUid();
      activeGlobalEnvironmentUid = globalEnvironments?.find(env => env?.uid == activeGlobalEnvironmentUid) ? activeGlobalEnvironmentUid : null;
      mainWindow.webContents.send('main:load-global-environments', { globalEnvironments, activeGlobalEnvironmentUid });
    }
    catch(error) {
      console.error("Error occured while fetching global environements!");
      console.error(error);
    }
  });

  ipcMain.on('main:open-preferences', () => {
    mainWindow.webContents.send('main:open-preferences');
  });

  ipcMain.handle('renderer:save-preferences', async (event, preferences) => {
    try {
      await savePreferences(preferences);
    } catch (error) {
      return Promise.reject(error);
    }
  });
};

module.exports = registerPreferencesIpc;
