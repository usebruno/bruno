const path = require('node:path');
const { JobType, getPool } = require('../pool');
const { defaultClassify, normalize } = require('../../utils/mount');
const { SearchIndex } = require('./index');

let sharedIndex = null;
const getSearchIndex = () => {
  if (!sharedIndex) sharedIndex = new SearchIndex({});
  return sharedIndex;
};

const parseForIndex = async (root, entry) => {
  const cls = defaultClassify(entry.relativePath);
  let name = path.basename(entry.relativePath);
  let method = null;
  let url = null;

  try {
    const result = await getPool().run(JobType.ParseFile, {
      collectionPath: root,
      relativePath: entry.relativePath,
      format: cls.format,
      type: cls.type
    });
    if (result.data?.name) name = result.data.name;
    method = result.data?.request?.method || null;
    url = result.data?.request?.url || null;
  } catch (err) {}

  return {
    relativePath: entry.relativePath,
    absolutePath: entry.absolutePath,
    name,
    method,
    url,
    mtime: entry.mtime,
    hash: entry.hash
  };
};

const indexCollection = async ({ collectionPath, collectionUid, collectionName, denylist }) => {
  const root = normalize(collectionPath);
  const index = getSearchIndex();
  const { added, updated, removed } = await index.status(root, { denylist });

  const toParse = [...added, ...updated].filter((entry) => defaultClassify(entry.relativePath)?.type === 'request');
  const parsed = await Promise.all(toParse.map((entry) => parseForIndex(root, entry)));

  const upsert = parsed.map((entry) => ({ ...entry, collectionUid, collectionName }));
  const removeIds = removed
    .filter((entry) => defaultClassify(entry.relativePath)?.type === 'request')
    .map((entry) => entry.id);

  index.apply(root, { upsert, removeIds });

  return { indexed: upsert.length, removed: removeIds.length };
};

module.exports = { indexCollection, getSearchIndex, parseForIndex };
