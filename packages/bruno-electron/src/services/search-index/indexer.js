const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { getPool, JobType } = require('../pool');
const {
  walk,
  normalize,
  hashFileAsync,
  resolveDenylist,
  defaultClassify
} = require('../../utils/mount');

const BACKGROUND_INDEX_CONCURRENCY = Math.min(4, Math.max(1, Math.floor(os.availableParallelism() / 4)));

const folderInfo = (relativePath) => {
  const dir = path.dirname(relativePath);
  return dir === '.' || dir === '' ? { folderPath: null, folderName: null } : { folderPath: dir, folderName: path.basename(dir) };
};

const toRow = (collectionPath, collectionName, { relativePath, mtime, hash, data }) => ({
  collectionPath,
  collectionName,
  ...folderInfo(relativePath),
  requestPath: relativePath,
  requestName: data?.name || path.basename(relativePath),
  requestType: data?.request?.method || null,
  requestUrl: data?.request?.url || null,
  requestProtocol: data?.type || 'http-request',
  mtime,
  hash
});

const indexFromFileCache = (searchIndex, collectionPath, collectionName, entries) => {
  searchIndex.transaction(() => {
    searchIndex.clearCollection(collectionPath);
    for (const [relativePath, entry] of entries) {
      if (defaultClassify(relativePath)?.type !== 'request') continue;
      searchIndex.upsert(toRow(collectionPath, collectionName, { relativePath, ...entry }));
    }
  });
};

const runWithConcurrency = async (items, limit, task) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  });
  await Promise.all(runners);
};

const indexUncached = async (searchIndex, collectionPath, collectionName, denylist, concurrency) => {
  const files = walk(collectionPath, resolveDenylist(denylist))
    .map((f) => ({ ...f, cls: defaultClassify(f.relativePath) }))
    .filter((f) => f.cls?.type === 'request');
  const stored = searchIndex.entriesFor(collectionPath);

  const statuses = await Promise.all(files.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);
    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }
    return { kind: 'stale', relativePath, format: cls.format };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  for (const [relativePath] of stored) {
    if (!seen.has(relativePath)) searchIndex.remove(collectionPath, relativePath);
  }

  const toParse = statuses.filter((s) => s.kind === 'stale');
  if (!toParse.length) return;

  const pool = getPool();
  await runWithConcurrency(toParse, concurrency, async ({ relativePath, format }) => {
    const result = await pool.run(JobType.ParseFile, { collectionPath, relativePath, format, type: 'request' });
    if (result.error) return;
    searchIndex.upsert(toRow(collectionPath, collectionName, result));
  });
};

const indexCollection = async (searchIndex, fileIndex, { collectionPath, collectionName, denylist, concurrency = BACKGROUND_INDEX_CONCURRENCY }) => {
  const root = normalize(collectionPath);
  const cached = fileIndex.entries(root);
  if (cached.size > 0) {
    indexFromFileCache(searchIndex, root, collectionName, cached);
    return;
  }
  await indexUncached(searchIndex, root, collectionName, denylist, concurrency);
};

const revalidateEntry = async (searchIndex, { collectionPath, collectionName, requestPath }) => {
  const root = normalize(collectionPath);
  const absolutePath = path.join(root, requestPath);
  const prior = searchIndex.entry(root, requestPath);

  let stat;
  try {
    stat = await fs.promises.stat(absolutePath, { bigint: true });
  } catch (err) {
    if (prior) searchIndex.remove(root, requestPath);
    return null;
  }

  if (prior && prior.mtime === stat.mtimeNs) return prior;
  if (prior) {
    const hash = await hashFileAsync(absolutePath);
    if (hash === prior.hash) return prior;
  }

  const cls = defaultClassify(requestPath);
  if (cls?.type !== 'request') {
    if (prior) searchIndex.remove(root, requestPath);
    return null;
  }

  const result = await getPool().run(JobType.ParseFile, { collectionPath: root, relativePath: requestPath, format: cls.format, type: 'request' });
  if (result.error) return prior || null;
  const row = toRow(root, collectionName || prior?.collectionName, result);
  searchIndex.upsert(row);
  return row;
};

module.exports = { indexCollection, revalidateEntry, BACKGROUND_INDEX_CONCURRENCY };
