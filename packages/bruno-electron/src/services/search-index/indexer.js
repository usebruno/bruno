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

const toRow = (collectionPath, collectionName, { relativePath, mtime, hash, data }, workspacePath) => ({
  collectionPath,
  collectionName,
  ...folderInfo(relativePath),
  requestPath: relativePath,
  requestName: data?.name || path.basename(relativePath),
  requestType: data?.request?.method || null,
  requestUrl: data?.request?.url || null,
  requestProtocol: data?.type || 'http-request',
  workspacePath,
  mtime,
  hash
});

const runWithConcurrency = async (items, limit, task) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  });
  await Promise.all(runners);
};

const indexUncached = async (searchIndex, collectionPath, collectionName, denylist, concurrency, workspacePath, fileIndex) => {
  const files = walk(collectionPath, resolveDenylist(denylist))
    .map((f) => ({ ...f, cls: defaultClassify(f.relativePath) }))
    .filter((f) => f.cls?.type === 'request');
  const stored = searchIndex.entriesFor(collectionPath);
  const cached = fileIndex ? fileIndex.entries(collectionPath) : null;

  const statuses = await Promise.all(files.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);
    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }

    const cachedEntry = cached?.get(relativePath);
    if (cachedEntry && cachedEntry.mtime === stat.mtimeNs) {
      return { kind: 'cached', relativePath, entry: cachedEntry };
    }

    return { kind: 'stale', relativePath, format: cls.format };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  for (const [relativePath] of stored) {
    if (!seen.has(relativePath)) searchIndex.remove(collectionPath, relativePath);
  }

  for (const status of statuses) {
    if (status.kind !== 'cached') continue;
    searchIndex.upsert(toRow(collectionPath, collectionName, { relativePath: status.relativePath, ...status.entry }, workspacePath));
  }

  const toParse = statuses.filter((s) => s.kind === 'stale');
  if (!toParse.length) return;

  const pool = getPool();
  await runWithConcurrency(toParse, concurrency, async ({ relativePath, format }) => {
    const result = await pool.runOnce(JobType.ParseFile, { collectionPath, relativePath, format, type: 'request' });
    if (result.error) return;
    searchIndex.upsert(toRow(collectionPath, collectionName, result, workspacePath));
    if (fileIndex) {
      try {
        fileIndex.stage(collectionPath, {
          op: 'add',
          relativePath,
          mtime: result.mtime,
          hash: result.hash,
          data: result.data,
          raw: result.raw
        });
      } catch (_) {}
    }
  });
};

// One run per collection at a time; a request that arrives mid-run joins it instead of walking and parsing again
const activeRuns = new Map();

const indexCollection = (searchIndex, { collectionPath, collectionName, denylist, concurrency = BACKGROUND_INDEX_CONCURRENCY, workspacePath, fileIndex }) => {
  const root = normalize(collectionPath);
  const running = activeRuns.get(root);
  if (running) return running;

  const run = indexUncached(searchIndex, root, collectionName, denylist, concurrency, workspacePath, fileIndex)
    .finally(() => activeRuns.delete(root));
  activeRuns.set(root, run);
  return run;
};

module.exports = { indexCollection, toRow, BACKGROUND_INDEX_CONCURRENCY };
