const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { getPool, JobType } = require('../pool');
const {
  walk,
  hashFileAsync,
  resolveDenylist,
  defaultClassify
} = require('../../utils/mount');
const { ingestParsedFile, ingestCachedFile, removeFromSearchIndex } = require('./ingest');

const { toRow, toMetaRow } = require('./rows');

const isIndexedFolder = (relativeDir) => {
  const [first] = relativeDir.split(path.sep);
  return Boolean(relativeDir) && first !== 'environments' && first !== 'mocks';
};

const withParentFolders = (folderPaths) => {
  const all = new Set();
  for (const folderPath of folderPaths) {
    const segments = folderPath.split(path.sep).filter(Boolean);
    for (let i = 1; i <= segments.length; i++) all.add(segments.slice(0, i).join(path.sep));
  }
  return [...all].filter(isIndexedFolder);
};

const selectNamingFiles = (collectionPath, allFiles) => {
  const chosen = new Map();
  for (const file of allFiles) {
    const row = toMetaRow(collectionPath, { relativePath: file.relativePath });
    if (!row) continue;
    if (file.cls.type === 'collection' && file.cls.format !== 'yml') continue;

    const key = row.entity === 'folder' ? `folder:${row.folderPath}` : 'collection';
    const rank = file.cls.type !== 'config' && file.cls.format === 'yml' ? 0 : 1;
    const current = chosen.get(key);
    if (!current || rank < current.rank) chosen.set(key, { file, rank });
  }
  return [...chosen.values()].map(({ file }) => file);
};

const failedResult = async (collectionPath, relativePath, err) => {
  try {
    const absolutePath = path.join(collectionPath, relativePath);
    const [stat, hash] = await Promise.all([
      fs.promises.stat(absolutePath, { bigint: true }),
      hashFileAsync(absolutePath)
    ]);
    return { relativePath, mtime: stat.mtimeNs, hash, data: {}, error: { message: err?.message || 'The file could not be parsed' } };
  } catch (_) {
    return null;
  }
};

const runWithConcurrency = async (items, limit, task) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  });
  await Promise.all(runners);
};

const WRITE_BATCH_SIZE = 200;

const createWriteBatch = (onWrite) => {
  let pending = [];
  let changed = false;

  const flush = () => {
    if (!pending.length) return;
    const writes = pending;
    pending = [];
    for (const write of writes) write();
    if (changed) onWrite?.();
    changed = false;
  };

  const add = (write) => {
    pending.push(() => {
      if (write()) changed = true;
    });
    if (pending.length >= WRITE_BATCH_SIZE) flush();
  };

  return { add, flush };
};

const ingestCtx = (searchIndex, fileIndex, collectionPath, collectionName, workspacePath) => ({
  searchIndex,
  fileIndex,
  collectionPath,
  collectionName,
  workspacePath
});

const indexMetadata = async (searchIndex, collectionPath, collectionName, workspacePath, metaFiles, fileIndex, onWork, writes) => {
  const stored = searchIndex.metaEntriesFor(collectionPath);
  const ctx = ingestCtx(searchIndex, fileIndex, collectionPath, collectionName, workspacePath);

  const statuses = await Promise.all(metaFiles.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);
    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }

    const cachedEntry = fileIndex?.entryFor(collectionPath, relativePath);
    if (cachedEntry && cachedEntry.mtime === stat.mtimeNs) {
      return { kind: 'cached', relativePath, entry: cachedEntry };
    }

    return { kind: 'stale', relativePath, format: cls.format, type: cls.type };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  const removed = [...stored.keys()].filter((relativePath) => !seen.has(relativePath));
  if (removed.length || statuses.some((s) => s.kind !== 'unchanged')) onWork?.();

  for (const relativePath of removed) {
    writes.add(() => removeFromSearchIndex({ searchIndex, collectionPath, relativePath }));
  }

  for (const status of statuses) {
    if (status.kind === 'cached') {
      writes.add(() => ingestCachedFile(ctx, status.relativePath, status.entry));
      continue;
    }
    if (status.kind !== 'stale') continue;

    let result;
    try {
      result = await getPool().runOnce(JobType.ParseFile, {
        collectionPath,
        relativePath: status.relativePath,
        format: status.format,
        type: status.type
      });
    } catch (err) {
      result = await failedResult(collectionPath, status.relativePath, err);
    }
    if (!result) continue;
    writes.add(() => ingestParsedFile({ ...ctx, result }));
  }
};

const indexUncached = async (searchIndex, collectionPath, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork, onWrite) => {
  const folderPaths = [];
  const allFiles = walk(collectionPath, resolveDenylist(denylist), folderPaths)
    .map((f) => ({ ...f, cls: defaultClassify(f.relativePath) }));
  const files = allFiles.filter((f) => f.cls?.type === 'request');
  const metaFiles = selectNamingFiles(collectionPath, allFiles);
  const stored = searchIndex.entriesFor(collectionPath);
  const ctx = ingestCtx(searchIndex, fileIndex, collectionPath, collectionName, workspacePath);

  searchIndex.syncFolders({
    collectionPath,
    collectionName,
    workspacePath,
    folderPaths: withParentFolders(folderPaths)
  });

  const writes = createWriteBatch(onWrite);

  await indexMetadata(searchIndex, collectionPath, collectionName, workspacePath, metaFiles, fileIndex, onWork, writes);

  const statuses = await Promise.all(files.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);

    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }

    const cachedEntry = fileIndex?.entryFor(collectionPath, relativePath);
    if (cachedEntry && cachedEntry.mtime === stat.mtimeNs) {
      return { kind: 'cached', relativePath, entry: cachedEntry };
    }

    return { kind: 'stale', relativePath, format: cls.format };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  const removed = [...stored.keys()].filter((relativePath) => !seen.has(relativePath));
  if (removed.length || statuses.some((s) => s.kind !== 'unchanged')) onWork?.();

  for (const relativePath of removed) {
    writes.add(() => removeFromSearchIndex({ searchIndex, collectionPath, relativePath }));
  }

  for (const status of statuses) {
    if (status.kind === 'cached') {
      writes.add(() => ingestCachedFile(ctx, status.relativePath, status.entry));
    }
  }

  const toParse = statuses.filter((s) => s.kind === 'stale');
  if (!toParse.length) {
    writes.flush();
    return;
  }

  const pool = getPool();
  await runWithConcurrency(toParse, concurrency, async ({ relativePath, format }) => {
    let result;
    try {
      result = await pool.runOnce(JobType.ParseFile, {
        collectionPath,
        relativePath,
        format,
        type: 'request'
      });
    } catch (err) {
      result = await failedResult(collectionPath, relativePath, err);
    }
    if (!result) return;
    writes.add(() => ingestParsedFile({ ...ctx, result }));
  });
  writes.flush();
};

const activeRuns = new Map();

const indexCollection = (searchIndex, { collectionPath, collectionName, denylist, concurrency = os.availableParallelism(), workspacePath, fileIndex, onWork, onWrite }) => {
  const root = path.resolve(collectionPath);
  const running = activeRuns.get(root);
  if (running) return running;

  const run = indexUncached(searchIndex, root, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork, onWrite)
    .finally(() => activeRuns.delete(root));
  activeRuns.set(root, run);
  return run;
};

module.exports = { indexCollection, toRow, toMetaRow, isIndexedFolder, withParentFolders };
