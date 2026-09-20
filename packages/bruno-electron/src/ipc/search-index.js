const { ipcMain } = require('electron');
const { indexCollection, getSearchIndex } = require('../services/search-index/indexer');
const { ensureWatching, closeAll: closeAllSearchIndexWatchers } = require('../services/search-index/watcher');
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

const registerSearchIndexIpc = () => {
  ipcMain.handle('renderer:search-index-query', searchIndex);
  ipcMain.handle('renderer:search-index-warm', warmSearchIndex);
};

module.exports = { registerSearchIndexIpc, searchIndex, warmSearchIndex, indexedCollections, closeAllSearchIndexWatchers };
