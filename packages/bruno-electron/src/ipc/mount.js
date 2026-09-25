const { ipcMain, BrowserWindow } = require('electron');
const { MountManager } = require('../services/mount');

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

  ipcMain.handle('renderer:search-index-trees', (_, term, workspacePath) => {
    if (!term || typeof term !== 'string') return {};
    return manager.searchIndexTrees(term, workspacePath);
  });

  ipcMain.handle('renderer:clear-search-index', async () => {
    manager.clearSearchIndex();
    return { fileCacheSize: manager.getCacheSize(), searchIndexSize: manager.getSearchIndexSize() };
  });

  ipcMain.handle('renderer:index-collections', (_, collections, workspacePath) =>
    manager.indexManyCollectionsInBackground(collections, workspacePath)
  );

  ipcMain.handle(
    'renderer:mount-collection-v2',
    async (event, { collectionUid, collectionPathname, brunoConfig, workspacePathname }) => {
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
      return manager.mount({ win, collectionPath: collectionPathname, collectionUid, brunoConfig, emit, workspacePath: workspacePathname });
    }
  );
};

const unmount = (collectionUid) => manager.unmount(collectionUid);
const shutdown = () => manager.shutdown();
const clearCollectionIndex = (collectionPath) => manager.clearCollectionIndex(collectionPath);

const indexWorkspaceCollections = (collections, workspacePath) => manager.indexManyCollectionsInBackground(collections, workspacePath);

const indexCollectionInBackground = (collectionPath, collectionName, workspacePath) =>
  manager.indexCollectionInBackground({ collectionPath, collectionName, workspacePath });

const sweepRemovedCollections = (validPaths) => manager.sweepRemovedCollections(validPaths);

module.exports = {
  registerMountIpc,
  unmount,
  shutdown,
  clearCollectionIndex,
  indexWorkspaceCollections,
  indexCollectionInBackground,
  sweepRemovedCollections
};
