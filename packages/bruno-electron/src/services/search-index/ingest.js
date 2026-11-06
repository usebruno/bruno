const { defaultClassify } = require('../../utils/mount');
const { preferencesUtil } = require('../../store/preferences');
const { getSearchIndex } = require('./index');
const { toRow, toMetaRow } = require('./rows');

const stageFileIndex = (fileIndex, collectionPath, result) => {
  if (!fileIndex || result.error || result.mtime === undefined) return;
  try {
    fileIndex.stage(collectionPath, {
      op: 'add',
      relativePath: result.relativePath,
      mtime: result.mtime,
      hash: result.hash,
      data: result.data,
      raw: result.raw
    });
  } catch (_) {}
};

const ingestParsedFile = ({ searchIndex, fileIndex, collectionPath, result }) => {
  if (!result?.relativePath) return false;

  const type = defaultClassify(result.relativePath)?.type;
  if (type === 'request') {
    if (result.mtime === undefined) return false;
    const changed = searchIndex.upsert(toRow(collectionPath, result));
    stageFileIndex(fileIndex, collectionPath, result);
    return changed;
  }

  if (result.error) return false;
  const metaRow = toMetaRow(collectionPath, result);
  if (!metaRow) return false;
  const changed = searchIndex.upsertMeta(metaRow);
  stageFileIndex(fileIndex, collectionPath, result);
  return changed;
};

const removeFromSearchIndex = ({ searchIndex, collectionPath, relativePath }) => {
  if (!relativePath) return false;
  return searchIndex.remove(collectionPath, relativePath) || searchIndex.removeMeta(collectionPath, relativePath);
};

// One transaction per batch: a commit per file is the dominant cost when ingesting a collection
const ingestBatch = ({ parsed = [], removed = [], fileIndex = null }) => {
  if (!preferencesUtil.isSearchIndexEnabled()) return;
  try {
    const searchIndex = getSearchIndex();
    searchIndex.transaction(() => {
      for (const { collectionPath, result } of parsed) ingestParsedFile({ searchIndex, fileIndex, collectionPath, result });
      for (const { collectionPath, relativePath } of removed) removeFromSearchIndex({ searchIndex, collectionPath, relativePath });
    });
  } catch (err) {
    console.warn('[search-index] failed to persist search index', err);
  }
};

module.exports = {
  ingestParsedFile,
  ingestBatch,
  removeFromSearchIndex
};
