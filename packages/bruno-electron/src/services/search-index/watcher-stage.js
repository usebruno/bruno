const fs = require('node:fs');
const path = require('node:path');
const { preferencesUtil } = require('../../store/preferences');
const { hashFile } = require('../../utils/mount');
const { getSearchIndex } = require('./index');
const { ingestParsedFile, removeFromSearchIndex } = require('./ingest');

const relativePathFor = (collectionPath, pathname) => {
  const relativePath = path.relative(collectionPath, pathname);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return relativePath;
};

const stageParsedToSearchIndex = (collectionPath, pathname, data) => {
  if (!preferencesUtil.isSearchIndexEnabled()) return;
  const relativePath = relativePathFor(collectionPath, pathname);
  if (!relativePath) return;
  try {
    const stat = fs.statSync(pathname, { bigint: true });
    ingestParsedFile({
      searchIndex: getSearchIndex(),
      collectionPath,
      collectionName: path.basename(collectionPath),
      result: { relativePath, mtime: stat.mtimeNs, hash: hashFile(pathname), data }
    });
  } catch (err) {
    console.warn('[search-index] watcher ingest failed', pathname, err);
  }
};

const removeFromSearchIndexPath = (collectionPath, pathname) => {
  if (!preferencesUtil.isSearchIndexEnabled()) return;
  const relativePath = relativePathFor(collectionPath, pathname);
  if (!relativePath) return;
  try {
    removeFromSearchIndex({ searchIndex: getSearchIndex(), collectionPath, relativePath });
  } catch (err) {
    console.warn('[search-index] watcher remove failed', pathname, err);
  }
};

module.exports = { stageParsedToSearchIndex, removeFromSearchIndexPath };
