const path = require('node:path');
const { JobType, getPool } = require('../pool');
const { defaultClassify, normalize } = require('../../utils/mount');
const { SearchIndex } = require('./index');

let sharedIndex = null;
const getSearchIndex = () => {
  if (!sharedIndex) sharedIndex = new SearchIndex({});
  return sharedIndex;
};

const parseForIndex = async (root, entry, type) => {
  const cls = defaultClassify(entry.relativePath);
  // A folder's own identity is its directory, not the folder.bru/folder.yml file describing it —
  // that file stays the thing `relativePath`/`absolutePath` track for diffing and removal.
  const itemPath = type === 'folder' ? path.dirname(entry.relativePath) : entry.relativePath;
  let name = path.basename(itemPath);
  let method = null;
  let url = null;
  let seq = null;

  try {
    const result = await getPool().run(JobType.ParseFile, {
      collectionPath: root,
      relativePath: entry.relativePath,
      format: cls.format,
      type: cls.type
    });
    if (type === 'folder') {
      if (result.data?.meta?.name) name = result.data.meta.name;
      seq = Number.isFinite(result.data?.meta?.seq) ? result.data.meta.seq : null;
    } else if (result.data?.name) {
      name = result.data.name;
    }
    method = result.data?.request?.method || null;
    url = result.data?.request?.url || null;
  } catch (err) {}

  return {
    relativePath: entry.relativePath,
    absolutePath: entry.absolutePath,
    itemPath,
    name,
    method,
    url,
    type,
    seq,
    mtime: entry.mtime,
    hash: entry.hash
  };
};

const indexCollection = async ({ collectionPath, collectionUid, collectionName, denylist }) => {
  const root = normalize(collectionPath);
  const index = getSearchIndex();
  const { added, updated, removed } = await index.status(root, { denylist });

  const classifyType = (entry) => defaultClassify(entry.relativePath)?.type;
  const toParse = [...added, ...updated].filter((entry) => ['request', 'folder'].includes(classifyType(entry)));
  const parsed = await Promise.all(toParse.map((entry) => parseForIndex(root, entry, classifyType(entry))));

  const upsert = parsed.map((entry) => ({ ...entry, collectionUid, collectionName }));
  const removeIds = removed
    .filter((entry) => ['request', 'folder'].includes(classifyType(entry)))
    .map((entry) => entry.id);

  index.apply(root, { upsert, removeIds });

  return { indexed: upsert.length, removed: removeIds.length };
};

module.exports = { indexCollection, getSearchIndex, parseForIndex };
