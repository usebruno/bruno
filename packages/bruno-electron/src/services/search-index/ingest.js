const { defaultClassify } = require('../../utils/mount');
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

const ingestParsedFile = ({
  searchIndex,
  fileIndex,
  collectionPath,
  collectionName,
  workspacePath,
  result
}) => {
  if (!searchIndex || !result?.relativePath) return false;

  const resolvedName = searchIndex.collectionNameFor(collectionPath) || collectionName;
  const type = defaultClassify(result.relativePath)?.type;
  if (type === 'request') {
    if (result.mtime === undefined) return false;
    const changed = searchIndex.upsert(toRow(collectionPath, resolvedName, result, workspacePath));
    stageFileIndex(fileIndex, collectionPath, result);
    return changed;
  }

  if (type !== 'config' && type !== 'collection' && type !== 'folder') return false;
  if (result.error) return false;
  const metaRow = toMetaRow(collectionPath, result);
  if (!metaRow) return false;
  const changed = searchIndex.upsertMeta(metaRow);
  stageFileIndex(fileIndex, collectionPath, result);
  return changed;
};

const ingestCachedFile = (ctx, relativePath, entry) => {
  if (!entry || entry.mtime === undefined) return false;
  return ingestParsedFile({
    ...ctx,
    result: {
      relativePath,
      mtime: entry.mtime,
      hash: entry.hash,
      data: entry.data,
      error: entry.error,
      raw: entry.raw
    }
  });
};

const removeFromSearchIndex = ({ searchIndex, collectionPath, relativePath }) => {
  if (!searchIndex || !relativePath) return false;
  return searchIndex.remove(collectionPath, relativePath) || searchIndex.removeMeta(collectionPath, relativePath);
};

module.exports = {
  ingestParsedFile,
  ingestCachedFile,
  removeFromSearchIndex,
  stageFileIndex
};
