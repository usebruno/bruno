const { ipcMain, nativeTheme } = require('electron');
const { getPreferences, savePreferences } = require('../store/preferences');
const { getGitVersion } = require('../utils/git');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { getCachedSystemProxy, fetchSystemProxy } = require('../store/system-proxy');
const { getAppSnapshot, saveAppSnapshot } = require('../store/app-snapshot');
const collectionWatcher = require('../app/collection-watcher');
const { resolveDefaultLocation } = require('../utils/default-location');
const onboardUser = require('../app/onboarding');
const LastOpenedCollections = require('../store/last-opened-collections');

const registerPreferencesIpc = (mainWindow) => {
  const lastOpenedCollections = new LastOpenedCollections();

  const onboardingPromise = onboardUser(mainWindow, lastOpenedCollections);

  ipcMain.handle('renderer:ready', async (event) => {
    await onboardingPromise;

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

  ipcMain.handle('renderer:get-system-proxy-variables', async () => {
    return await getCachedSystemProxy();
  });

  ipcMain.handle('renderer:refresh-system-proxy', async () => {
    return await fetchSystemProxy({ refresh: true });
  });

  ipcMain.handle('renderer:get-app-snapshot', async () => {
    try {
      return getAppSnapshot();
    } catch (error) {
      console.error('Error getting app snapshot:', error);
      return null;
    }
  });

  ipcMain.handle('renderer:save-app-snapshot', async (event, snapshot) => {
    try {
      saveAppSnapshot(snapshot);
    } catch (error) {
      console.error('Error saving app snapshot:', error);
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:is-collection-mount-complete', async (event, collectionUid) => {
    return collectionWatcher.isCollectionMountComplete(collectionUid);
  });
};

module.exports = registerPreferencesIpc;
