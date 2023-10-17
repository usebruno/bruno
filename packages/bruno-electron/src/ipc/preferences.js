const { ipcMain } = require('electron');
const { getPreferences, savePreferences, getPath } = require('../store/preferences');
const { isDirectory } = require('../utils/filesystem');
const { openCollection } = require('../app/collections');
const stores = require('../store');
const chokidar = require('chokidar');

const registerPreferencesIpc = (mainWindow, watcher, lastOpenedCollections) => {
  const change = async (pathname, store) => {
    if (store === stores.PREFERENCES) {
      mainWindow.webContents.send('main:load-preferences', getPreferences());
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
  storeWatcher.addWatcher(getPath(), stores.PREFERENCES);

  ipcMain.handle('renderer:ready', async (event) => {
    // load preferences
    const preferences = getPreferences();
    mainWindow.webContents.send('main:load-preferences', preferences);

    // reload last opened collections
    const lastOpened = lastOpenedCollections.getAll();

    if (lastOpened && lastOpened.length) {
      for (let collectionPath of lastOpened) {
        if (isDirectory(collectionPath)) {
          await openCollection(mainWindow, watcher, collectionPath, {
            dontSendDisplayErrors: true
          });
        }
      }
    }
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
