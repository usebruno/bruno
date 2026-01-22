const { ipcMain, nativeTheme } = require('electron');
const { getPreferences, savePreferences, preferencesUtil } = require('../store/preferences');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { parsedFileCacheStore } = require('../store/parsed-file-cache');

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
      activeGlobalEnvironmentUid = globalEnvironments?.find((env) => env?.uid == activeGlobalEnvironmentUid) ? activeGlobalEnvironmentUid : null;
      mainWindow.webContents.send('main:load-global-environments', { globalEnvironments, activeGlobalEnvironmentUid });
    } catch (error) {
      console.error('Error occured while fetching global environements!');
      console.error(error);
    }

    ipcMain.emit('main:renderer-ready', mainWindow);
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

  ipcMain.on('renderer:theme-change', (event, theme) => {
    nativeTheme.themeSource = theme;
  });

  ipcMain.handle('renderer:get-cache-stats', async () => {
    try {
      return parsedFileCacheStore.getStats();
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('renderer:purge-cache', async () => {
    try {
      await parsedFileCacheStore.clear();
      return { success: true };
    } catch (error) {
      console.error('Error purging cache:', error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = registerPreferencesIpc;
