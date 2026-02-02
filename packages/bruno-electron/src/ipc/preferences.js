const { ipcMain, nativeTheme } = require('electron');
const { getPreferences, savePreferences } = require('../store/preferences');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { getCachedSystemProxy, refreshSystemProxy } = require('../store/system-proxy');

const registerPreferencesIpc = (mainWindow) => {
  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

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

  ipcMain.handle('renderer:get-system-proxy-variables', async () => {
    // Return cached value (initialized at app startup)
    const cachedProxy = getCachedSystemProxy();
    if (cachedProxy) {
      return cachedProxy;
    }
    // Fallback: refresh if cache is empty (shouldn't happen normally)
    return await refreshSystemProxy();
  });

  ipcMain.handle('renderer:refresh-system-proxy', async () => {
    return await refreshSystemProxy();
  });
};

module.exports = registerPreferencesIpc;
