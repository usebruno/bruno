const { ipcMain, nativeTheme } = require('electron');
const { getPreferences, savePreferences } = require('../store/preferences');
const { getGitVersion } = require('../utils/git');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { parsedFileCacheStore } = require('../store/parsed-file-cache-idb');
const { getCachedSystemProxy, refreshSystemProxy } = require('../store/system-proxy');
const { resolveDefaultLocation } = require('../utils/default-location');

const registerPreferencesIpc = (mainWindow) => {
  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();

    // Set the default location if it hasn't been set by the user
    if (!preferences.general?.defaultLocation) {
      preferences.general ??= {};
      preferences.general.defaultLocation = resolveDefaultLocation();
      await savePreferences(preferences);
    }

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

    const gitVersion = await getGitVersion();
    mainWindow.webContents.send('main:git-version', gitVersion);

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
      return await parsedFileCacheStore.getStats();
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
