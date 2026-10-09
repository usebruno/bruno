const { ipcMain, BrowserWindow } = require('electron');
const { MountManager } = require('../services/mount');
const { checkpoint, createSpan } = require('../utils/benchmark');

const manager = new MountManager();

const windowAndEmit = (event, collectionUid) => {
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
  return { win, emit };
};

const mountCollectionPaths = (event, { collectionUid, collectionPathname, pathnames } = {}) => {
  const isPathList = Array.isArray(pathnames) && pathnames.every((pathname) => typeof pathname === 'string');
  if (typeof collectionUid !== 'string' || typeof collectionPathname !== 'string' || !isPathList) {
    throw new Error('mount-paths needs a collection uid, the collection path and a list of item paths');
  }
  const { win, emit } = windowAndEmit(event, collectionUid);
  return manager.mountPaths({ win, collectionPath: collectionPathname, collectionUid, emit, pathnames });
};

const registerMountIpc = () => {
  ipcMain.handle('renderer:get-search-index-size', () => manager.getSearchIndexSize());

  ipcMain.handle('renderer:get-search-index-status', () => manager.getIndexingStatus());

  ipcMain.handle('renderer:search-index', (_, term, options) => {
    if (!term || typeof term !== 'string') return [];
    return manager.searchIndex(term, options || {});
  });

  ipcMain.handle('renderer:search-index-tree', (_, { collectionPath, collectionName, skipIndexing }) => {
    if (!collectionPath) return { items: [] };
    return manager.getIndexTree({ collectionPath, collectionName, skipIndexing: skipIndexing === true });
  });

  ipcMain.handle('renderer:search-index-trees', (_, term, workspacePath) => {
    if (!term || typeof term !== 'string') return {};
    return manager.searchIndexTrees(term, workspacePath);
  });

  ipcMain.handle('renderer:clear-search-index', async () => {
    manager.clearSearchIndex();
    return { searchIndexSize: manager.getSearchIndexSize() };
  });

  ipcMain.handle('renderer:index-collections', (_, collections, workspacePath) =>
    manager.indexManyCollectionsInBackground(collections, workspacePath)
  );

  ipcMain.handle('renderer:mount-paths', mountCollectionPaths);

  ipcMain.handle(
    'renderer:mount-collection-v2',
    async (event, { collectionUid, collectionPathname, brunoConfig, workspacePathname }) => {
      const span = createSpan('mount-collection-v2', { collectionPathname });
      checkpoint('mount-collection-start', { collectionPathname });

      try {
        const { win, emit } = windowAndEmit(event, collectionUid);
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
  mountCollectionPaths,
  unmount,
  shutdown,
  getWatcherIndexOptions,
  clearCollectionIndex
};
