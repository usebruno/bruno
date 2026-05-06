const fs = require('fs');
const { ipcMain, nativeTheme } = require('electron');
const { getPreferences, savePreferences } = require('../store/preferences');
const { getGitVersion } = require('../utils/git');
const { globalEnvironmentsStore } = require('../store/global-environments');
const { getCachedSystemProxy, fetchSystemProxy } = require('../store/system-proxy');
const { resolveDefaultLocation } = require('../utils/default-location');
const onboardUser = require('../app/onboarding');
const LastOpenedCollections = require('../store/last-opened-collections');
const WindowStateStore = require('../store/window-state');
const { clearAgentCache } = require('@usebruno/requests');

const registerPreferencesIpc = (mainWindow) => {
  const lastOpenedCollections = new LastOpenedCollections();

  const onboardingPromise = onboardUser(mainWindow, lastOpenedCollections);

  ipcMain.handle('renderer:ready', async (event) => {
    await onboardingPromise;

    // load preferences
    const preferences = getPreferences();

    // Set the default location if it hasn't been set by the user
    if (!preferences.general?.defaultLocation || !fs.existsSync(preferences.general.defaultLocation)) {
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
      console.error('Error occurred while fetching global environments!');
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

  ipcMain.handle('renderer:clear-http-https-agent-cache', async () => {
    try {
      clearAgentCache();
    } catch (error) {
      return Promise.reject(error);
    }
  });

  ipcMain.on('renderer:theme-change', (event, theme, themeBg) => {
    nativeTheme.themeSource = theme;
    const windowStateStore = new WindowStateStore();
    windowStateStore.setThemeMode(theme);
    if (themeBg) {
      windowStateStore.setThemeBg(themeBg);
    }
  });

  ipcMain.handle('renderer:get-system-proxy-variables', async () => {
    return await getCachedSystemProxy();
  });

  ipcMain.handle('renderer:refresh-system-proxy', async () => {
    return await fetchSystemProxy({ refresh: true });
  });
};

module.exports = registerPreferencesIpc;
