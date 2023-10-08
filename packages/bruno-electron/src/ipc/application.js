const { ipcMain } = require('electron');
const chokidar = require('chokidar');
const stores = require('../store');

const registerApplicationIpc = (mainWindow, preferences) => {
  const change = async (pathname, store) => {
    if (store === stores.PREFERENCES) {
      mainWindow.webContents.send('main:preferences-read', preferences.getAll());
    }
  };

  class StoreWatcher {
    constructor() {
      this.watchers = {};
    }

    addWatcher(watchPath, store) {
      console.log(`watcher add: ${watchPath} for store ${store}`);

      if (this.watchers[watchPath]) {
        this.watchers[watchPath].close();
      }

      const self = this;
      setTimeout(() => {
        const watcher = chokidar.watch(watchPath, {
          ignoreInitial: false,
          usePolling: false,
          persistent: true,
          ignorePermissionErrors: true,
          awaitWriteFinish: {
            stabilityThreshold: 80,
            pollInterval: 10
          },
          depth: 20
        });

        watcher.on('change', (pathname) => change(pathname, store));

        self.watchers[watchPath] = watcher;
      }, 100);
    }

    hasWatcher(watchPath) {
      return this.watchers[watchPath];
    }

    removeWatcher(watchPath) {
      if (this.watchers[watchPath]) {
        this.watchers[watchPath].close();
        this.watchers[watchPath] = null;
      }
    }
  }

  const storeWatcher = new StoreWatcher();
  storeWatcher.addWatcher(preferences.getPath(), stores.PREFERENCES);

  ipcMain.handle('renderer:ready-application', async () => {
    mainWindow.webContents.send('main:preferences-read', preferences.getAll());
  });

  ipcMain.handle('renderer:set-preferences', async (event, newPreferences) => {
    preferences.setPreferences(newPreferences);
  });

  ipcMain.handle('renderer:migrate-preferences', async (event, sslVerification) => {
    preferences.migrateSslVerification(sslVerification);
  });
};

module.exports = registerApplicationIpc;
