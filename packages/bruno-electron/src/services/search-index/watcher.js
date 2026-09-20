const chokidar = require('chokidar');
const path = require('node:path');
const fs = require('node:fs');
const {
  DENY_DIRS,
  defaultClassify,
  normalize,
  posixifyPath,
  isDenied,
  resolveDenylist,
  hashFileAsync,
  idForAbsolutePath
} = require('../../utils/mount');
const { getSearchIndex, parseForIndex } = require('./indexer');

const watchers = new Map();

const isPathIgnored = (root, absolutePath, denylist) => {
  const relativePath = path.relative(root, absolutePath);
  if (!relativePath) return false;
  const segments = relativePath.split(path.sep);
  if (segments.some((segment) => DENY_DIRS.has(segment))) return true;
  return isDenied(posixifyPath(relativePath), denylist);
};

const ensureWatching = ({ collectionPath, collectionUid, collectionName, denylist }) => {
  const root = normalize(collectionPath);
  if (watchers.has(root)) return watchers.get(root);

  const resolvedDenylist = resolveDenylist(denylist);

  const upsertOne = async (absolutePath) => {
    const relativePath = path.relative(root, absolutePath);
    if (defaultClassify(relativePath)?.type !== 'request') return;

    try {
      const stat = await fs.promises.stat(absolutePath, { bigint: true });
      const hash = await hashFileAsync(absolutePath);
      const entry = await parseForIndex(root, { relativePath, absolutePath, mtime: stat.mtimeNs, hash });
      getSearchIndex().apply(root, { upsert: [{ ...entry, collectionUid, collectionName }] });
    } catch (err) {
      console.error(`[search-index] failed to index ${absolutePath}`, err);
    }
  };

  const removeOne = (absolutePath) => {
    const relativePath = path.relative(root, absolutePath);
    if (defaultClassify(relativePath)?.type !== 'request') return;
    getSearchIndex().apply(root, { removeIds: [idForAbsolutePath(absolutePath)] });
  };

  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    depth: 20,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 10 },
    ignored: (filepath) => isPathIgnored(root, filepath, resolvedDenylist)
  });

  watcher
    .on('add', upsertOne)
    .on('change', upsertOne)
    .on('unlink', removeOne)
    .on('error', (err) => console.error(`[search-index] watcher error for ${root}`, err));

  watchers.set(root, watcher);
  return watcher;
};

const closeAll = async () => {
  const all = Array.from(watchers.values());
  watchers.clear();
  await Promise.allSettled(all.map((watcher) => watcher.close()));
};

module.exports = { ensureWatching, closeAll };
