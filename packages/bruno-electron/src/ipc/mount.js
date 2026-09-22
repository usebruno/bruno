const { ipcMain, BrowserWindow } = require('electron');
const { MountManager } = require('../services/mount');
const { getAllWorkspaceCollections } = require('../utils/workspace-collections');

const manager = new MountManager();

const registerMountIpc = () => {
  ipcMain.handle('renderer:get-file-cache-size', () => manager.getCacheSize());

  ipcMain.handle('renderer:clear-file-cache', () => {
    manager.clearCache();
    return manager.getCacheSize();
  });

  ipcMain.handle('renderer:get-search-index-size', () => manager.getSearchIndexSize());

  ipcMain.handle('renderer:get-search-index-status', () => manager.getIndexingStatus());

  ipcMain.handle('renderer:search-index', (_, term, options) => {
    if (!term || typeof term !== 'string') return [];
    return manager.searchIndex(term, options || {});
  });

  ipcMain.handle('renderer:search-index-tree', (_, { collectionPath, collectionName }) => {
    if (!collectionPath) return { items: [] };
    return manager.getIndexTree({ collectionPath, collectionName });
  });

  ipcMain.handle('renderer:search-index-trees', (_, term) => {
    if (!term || typeof term !== 'string') return {};
    return manager.searchIndexTrees(term);
  });

  ipcMain.handle('renderer:clear-search-index', async () => {
    manager.clearCache();
    manager.clearSearchIndex();
    const sizes = { fileCacheSize: manager.getCacheSize(), searchIndexSize: manager.getSearchIndexSize() };
    getAllWorkspaceCollections().then(indexWorkspaceCollections).catch(() => {});
    return sizes;
  });

  ipcMain.handle(
    'renderer:mount-collection-v2',
    async (event, { collectionUid, collectionPathname, brunoConfig }) => {
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
      return manager.mount({ win, collectionPath: collectionPathname, collectionUid, brunoConfig, emit });
    }
  );
};

const unmount = (collectionUid) => manager.unmount(collectionUid);
const shutdown = () => manager.shutdown();
const clearCollectionIndex = (collectionPath) => manager.clearCollectionIndex(collectionPath);

const indexWorkspaceCollections = async (collections) => {
  for (const { path: collectionPath, name } of collections) {
    await manager.indexCollectionInBackground({ collectionPath, collectionName: name }).catch(() => {});
  }
};

const sweepRemovedCollections = (validPaths) => manager.sweepRemovedCollections(validPaths);

module.exports = {
  registerMountIpc,
  unmount,
  shutdown,
  clearCollectionIndex,
  indexWorkspaceCollections,
  sweepRemovedCollections
};
