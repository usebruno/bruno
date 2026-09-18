const { ipcMain, BrowserWindow } = require('electron');
const { MountManager } = require('../services/mount');
const { checkpoint, createSpan } = require('../utils/benchmark');

const manager = new MountManager();

const registerMountIpc = () => {
  ipcMain.handle('renderer:get-file-cache-size', () => manager.getCacheSize());

  ipcMain.handle('renderer:clear-file-cache', () => {
    manager.clearCache();
    return manager.getCacheSize();
  });

  ipcMain.handle(
    'renderer:mount-collection-v2',
    async (event, { collectionUid, collectionPathname, brunoConfig }) => {
      const span = createSpan('mount-collection-v2', { collectionUid, collectionPathname });
      checkpoint('mount-collection-start', { collectionUid, collectionPathname });

      try {
        const win = BrowserWindow.fromWebContents(event.sender);
        const send = (channel, payload) => {
          if (!win || win.isDestroyed?.()) return;
          win.webContents.send(channel, payload);
        };
        const emit = {
          tree: (tree) => send('main:collection-tree-loaded', { collectionUid, tree }),
          loading: (isLoading) => send('main:collection-loading-state-updated-v2', { collectionUid, isLoading }),
          config: (brunoConfig) => send('main:bruno-config-update-v2', { collectionUid, brunoConfig })
        };
        const result = await manager.mount({ win, collectionPath: collectionPathname, collectionUid, brunoConfig, emit });

        checkpoint('mount-collection-end', { collectionUid, collectionPathname });
        return result;
      } finally {
        span.stop();
      }
    }
  );
};

const unmount = (collectionUid) => manager.unmount(collectionUid);
const shutdown = () => manager.shutdown();
const clearCollectionIndex = (collectionPath) => manager.clearCollectionIndex(collectionPath);

module.exports = { registerMountIpc, unmount, shutdown, clearCollectionIndex };
