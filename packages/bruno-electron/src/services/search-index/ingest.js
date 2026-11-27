const { defaultClassify } = require('../../utils/mount');
const { transaction } = require('../sqlite');
const { getSearchIndex } = require('./index');
const { toRow, toMetaRow } = require('./rows');

const ingestParsedFile = ({ searchIndex, collectionPath, result }) => {
  if (!result?.relativePath) return false;

  const type = defaultClassify(result.relativePath)?.type;
  if (type === 'request') {
    if (result.mtime === undefined) return false;
    return searchIndex.upsert(toRow(collectionPath, result));
  }

  if (result.error) return false;
  const metaRow = toMetaRow(collectionPath, result);
  if (!metaRow) return false;
  return searchIndex.upsertMeta(metaRow);
};

const removeFromSearchIndex = ({ searchIndex, collectionPath, relativePath }) => {
  if (!relativePath) return false;
  return searchIndex.remove(collectionPath, relativePath) || searchIndex.removeMeta(collectionPath, relativePath);
};

// One transaction per batch: a commit per file is the dominant cost when ingesting a collection
const ingestBatch = ({ parsed = [], removed = [] }) => {
  try {
    const searchIndex = getSearchIndex();
    transaction(() => {
      for (const { collectionPath, result } of parsed) ingestParsedFile({ searchIndex, collectionPath, result });
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
