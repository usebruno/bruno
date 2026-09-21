const { ipcMain } = require('electron');
const { indexCollection, getSearchIndex } = require('../services/search-index/indexer');
const { ensureWatching, closeAll: closeAllSearchIndexWatchers } = require('../services/search-index/watcher');
const { buildFolderTree } = require('../services/search-index/build-tree');
const { getRequestUid } = require('../cache/requestUids');

const indexedCollections = new Set();

const ensureIndexed = async (collections) => {
  const toIndex = collections.filter((c) => c.pathname && !indexedCollections.has(c.pathname));
  await Promise.all(toIndex.map(async (c) => {
    try {
      await indexCollection({
        collectionPath: c.pathname,
        collectionUid: c.uid,
        collectionName: c.name,
        denylist: c.ignore
      });
      indexedCollections.add(c.pathname);
      ensureWatching({
        collectionPath: c.pathname,
        collectionUid: c.uid,
        collectionName: c.name,
        denylist: c.ignore
      });
    } catch (err) {
      console.error(`[search-index] failed to index ${c.pathname}`, err);
    }
  }));
};

const searchIndex = async (event, { collections = [], terms = [], limit } = {}) => {
  await ensureIndexed(collections);
  const rows = getSearchIndex().search({
    terms,
    collectionPaths: collections.map((c) => c.pathname).filter(Boolean),
    limit
  });
  return rows.map((row) => ({
    uid: getRequestUid(row.request_path),
    name: row.name,
    method: row.method,
    url: row.url,
    pathname: row.request_path,
    folderPath: row.folder_path,
    collectionUid: row.collection_uid,
    collectionName: row.collection_name
  }));
};

const warmSearchIndex = async (event, { collections = [] } = {}) => {
  await ensureIndexed(collections);
};

// The sidebar's tree shape for a collection that isn't mounted yet — folders and requests, read
// from the index instead of the (empty) in-memory tree. Not put into the real collection: the
// caller decides whether and where to render it.
const getCollectionTree = async (event, { collection } = {}) => {
  if (!collection?.pathname) return { items: [] };

  await ensureIndexed([collection]);
  const rows = getSearchIndex().getFolderTree(collection.pathname);
  return { items: buildFolderTree(collection.pathname, rows) };
};

const registerSearchIndexIpc = () => {
  ipcMain.handle('renderer:search-index-query', searchIndex);
  ipcMain.handle('renderer:search-index-warm', warmSearchIndex);
  ipcMain.handle('renderer:search-index-tree', getCollectionTree);
};

module.exports = {
  registerSearchIndexIpc,
  searchIndex,
  warmSearchIndex,
  getCollectionTree,
  indexedCollections,
  closeAllSearchIndexWatchers
};
