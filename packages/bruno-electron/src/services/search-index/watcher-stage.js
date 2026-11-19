const fs = require('node:fs');
const { preferencesUtil } = require('../../store/preferences');
const { defaultClassify, hashFile, relativePathWithin } = require('../../utils/mount');
const { getSearchIndex } = require('./index');
const { ingestParsedFile, removeFromSearchIndex } = require('./ingest');

const INDEXED_TYPES = new Set(['request', 'folder', 'collection', 'config']);

// Returns the { mtime, hash } it read so the file cache can stage the same version without re-hashing
const stageParsedToSearchIndex = (collectionPath, pathname, data) => {
  if (!preferencesUtil.isSearchIndexEnabled()) return null;
  const relativePath = relativePathWithin(collectionPath, pathname);
  if (!relativePath || !INDEXED_TYPES.has(defaultClassify(relativePath)?.type)) return null;
  try {
    const version = { mtime: fs.statSync(pathname, { bigint: true }).mtimeNs, hash: hashFile(pathname) };
    ingestParsedFile({
      searchIndex: getSearchIndex(),
      collectionPath,
      result: { relativePath, ...version, data }
    });
    return version;
  } catch (err) {
    console.warn('[search-index] watcher ingest failed', pathname, err);
    return null;
  }
};

const removeFromSearchIndexPath = (collectionPath, pathname) => {
  if (!preferencesUtil.isSearchIndexEnabled()) return;
  const relativePath = relativePathWithin(collectionPath, pathname);
  if (!relativePath) return;
  try {
    removeFromSearchIndex({ searchIndex: getSearchIndex(), collectionPath, relativePath });
  } catch (err) {
    console.warn('[search-index] watcher remove failed', pathname, err);
  }
};

module.exports = { stageParsedToSearchIndex, removeFromSearchIndexPath };
