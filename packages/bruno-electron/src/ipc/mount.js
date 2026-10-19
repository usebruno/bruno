const { ipcMain, BrowserWindow } = require('electron');
const { MountManager } = require('../services/mount');
const { checkpoint, createSpan } = require('../utils/benchmark');

const manager = new MountManager();

const registerMountIpc = () => {
  ipcMain.handle('renderer:get-search-index-size', () => manager.getSearchIndexSize());

  ipcMain.handle('renderer:get-search-index-status', () => manager.getIndexingStatus());

  ipcMain.handle('renderer:search-index', (_, term, options) => {
    if (!term || typeof term !== 'string') return [];
    return manager.searchIndex(term, options || {});
  });

  ipcMain.handle('renderer:search-index-trees', (_, term, workspacePath, knownRevision, searchWindow) => {
    if (!term || typeof term !== 'string') return {};
    return manager.searchIndexTrees(term, workspacePath, knownRevision, searchWindow || {});
  });

  ipcMain.handle('renderer:clear-search-index', async () => {
    manager.clearSearchIndex();
    return { searchIndexSize: manager.getSearchIndexSize() };
  });

  ipcMain.handle('renderer:index-collections', (_, collections, workspacePath, term) =>
    manager.indexManyCollectionsInBackground(collections, workspacePath, term)
  );

  ipcMain.handle(
    'renderer:mount-collection-v2',
    async (event, { collectionUid, collectionPathname, brunoConfig, workspacePathname }) => {
      const span = createSpan('mount-collection-v2', { collectionPathname });
      checkpoint('mount-collection-start', { collectionPathname });

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
        const result = await manager.mount({
          win,
          collectionPath: collectionPathname,
          collectionUid,
          brunoConfig,
          emit,
          workspacePath: workspacePathname
        });

        checkpoint('mount-collection-end', { collectionPathname });
        return result;
      } finally {
        span.stop();
      }
    }
  );
};

const unmount = (collectionUid) => manager.unmount(collectionUid);
const shutdown = (opts) => manager.shutdown(opts);
const getWatcherIndexOptions = (collectionPath, workspacePath) => manager.getWatcherIndexOptions(collectionPath, workspacePath);
const clearCollectionIndex = (collectionPath) => manager.clearCollectionIndex(collectionPath);

module.exports = {
  registerMountIpc,
  unmount,
  shutdown,
  getWatcherIndexOptions,
  clearCollectionIndex
};
