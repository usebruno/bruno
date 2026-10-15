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

const folderInfo = (relativePath) => {
  const dir = path.dirname(relativePath);
  return dir === '.' || dir === '' ? { folderPath: null, folderName: null } : { folderPath: dir, folderName: path.basename(dir) };
};

// `error` is set when the file could not be parsed; `data` then holds only what could still be read from it
const toRow = (collectionPath, collectionName, { relativePath, mtime, hash, data, error }, workspacePath) => ({
  collectionPath,
  collectionName,
  ...folderInfo(relativePath),
  requestPath: relativePath,
  requestName: data?.name || path.basename(relativePath),
  requestType: data?.request?.method || null,
  requestUrl: data?.request?.url || null,
  requestProtocol: data?.type || 'http-request',
  requestSeq: Number.isFinite(data?.seq) ? data.seq : null,
  requestError: error ? String(error.message ?? error) : null,
  workspacePath,
  mtime,
  hash
});

// A folder the user sees in the sidebar. The environments folder and the mock server's folder are not folders of requests.
const isIndexedFolder = (relativeDir) => {
  const [first] = relativeDir.split(path.sep);
  return Boolean(relativeDir) && first !== 'environments' && first !== 'mocks';
};

// The folder itself and every folder above it, for each given folder path
const withParentFolders = (folderPaths) => {
  const all = new Set();
  for (const folderPath of folderPaths) {
    const segments = folderPath.split(path.sep).filter(Boolean);
    for (let i = 1; i <= segments.length; i++) all.add(segments.slice(0, i).join(path.sep));
  }
  return [...all].filter(isIndexedFolder);
};

const isSeqValid = (seq) => Number.isInteger(seq) && seq > 0;

// The name and seq a metadata file gives. bruno.json is the collection config itself, opencollection.yml holds it
// under brunoConfig, and a folder file keeps them in its meta block. collection.bru has no name.
const metaFrom = (type, data) => {
  if (type === 'folder') {
    return { name: data?.meta?.name || null, seq: isSeqValid(data?.meta?.seq) ? data.meta.seq : null };
  }
  const config = type === 'collection' ? data?.brunoConfig : data;
  return { name: typeof config?.name === 'string' && config.name ? config.name : null, seq: null };
};

// Row for the file that names the collection (bruno.json, opencollection.yml) or a folder (folder.bru, folder.yml);
// null for every other file
const toMetaRow = (collectionPath, { relativePath, mtime, hash, data }) => {
  const type = defaultClassify(relativePath)?.type;
  if (type !== 'config' && type !== 'collection' && type !== 'folder') return null;
  const folderPath = type === 'folder' ? path.dirname(relativePath) : '';
  if (type === 'folder' && folderPath === '.') return null;
  return { collectionPath, relativePath, entity: type === 'folder' ? 'folder' : 'collection', folderPath, ...metaFrom(type, data), mtime, hash };
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

// When the worker itself fails (crash, timeout) there is no parse result at all. The file is still recorded as failed
// with its current mtime and hash, so it is not sent to a worker again until it changes.
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

const SLOW_BATCH_MS = 50;

const createWriteBatch = (searchIndex) => {
  let pending = [];
  let batch = { si: 0, fi: 0 };
  const stats = { batches: 0, writes: 0, ms: 0, si: 0, fi: 0, slow: 0, maxMs: 0 };

  const time = (part, write) => {
    const start = performance.now();
    try {
      return write();
    } finally {
      batch[part] += performance.now() - start;
    }
  };

  const flush = () => {
    if (!pending.length) return;
    const writes = pending;
    pending = [];
    batch = { si: 0, fi: 0 };
    const start = performance.now();
    searchIndex.transaction(() => {
      for (const write of writes) write();
    });
    const ms = performance.now() - start;
    stats.batches += 1;
    stats.writes += writes.length;
    stats.ms += ms;
    stats.si += batch.si;
    stats.fi += batch.fi;
    if (ms > SLOW_BATCH_MS) stats.slow += 1;
    stats.maxMs = Math.max(stats.maxMs, ms);
  };

  const add = (write) => {
    pending.push(write);
    if (pending.length >= WRITE_BATCH_SIZE) flush();
  };

  return { add, flush, time, stats };
};

const percentOf = (part, whole) => Math.round(Math.max(0, part) / whole * 100);

const megabytes = (bytes) => Math.round(bytes / 1048576);

const logRunSummary = (label, stats, runStart, parse) => {
  const busyPart = parse
    ? ` | MAIN BUSY ${percentOf(parse.activeMs, parse.wallMs)}% of parse phase (writes ${percentOf(parse.writeMs, parse.wallMs)}%, other ${percentOf(parse.activeMs - parse.writeMs, parse.wallMs)}%)`
    : '';
  const parsePart = parse ? ` | PARSE ONLY ${parse.ms.toFixed(0)} ms (${parse.files} files)${busyPart}` : '';
  const { heapUsed, rss } = process.memoryUsage();
  // console.log(`[search-index] ${label}${parsePart} | DB WRITES ${stats.ms.toFixed(0)} ms in ${stats.batches} batches (SI ${stats.si.toFixed(0)}, FI ${stats.fi.toFixed(0)}, commit/other ${(stats.ms - stats.si - stats.fi).toFixed(0)}; ${stats.slow} batches over ${SLOW_BATCH_MS} ms, slowest ${stats.maxMs.toFixed(0)} ms) | TOTAL ${(performance.now() - runStart).toFixed(0)} ms | HEAP ${megabytes(heapUsed)} MB, RSS ${megabytes(rss)} MB`);
};

// Keeps the collection and folder names/order in step with their files, the same way requests are kept in step:
// unchanged files are skipped, then the file index is tried, and only then is the file read again.
const indexMetadata = async (searchIndex, collectionPath, metaFiles, fileIndex, onWork, writes) => {
  const stored = searchIndex.metaEntriesFor(collectionPath);

  const statuses = await Promise.all(metaFiles.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);
    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }

    const cachedEntry = fileIndex?.entryFor(collectionPath, relativePath);
    if (cachedEntry && cachedEntry.mtime === stat.mtimeNs) return { kind: 'cached', relativePath, entry: cachedEntry };

    return { kind: 'stale', relativePath, format: cls.format, type: cls.type };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  const removed = [...stored.keys()].filter((relativePath) => !seen.has(relativePath));
  if (removed.length || statuses.some((s) => s.kind !== 'unchanged')) onWork?.();

  for (const relativePath of removed) writes.add(() => writes.time('si', () => searchIndex.removeMeta(collectionPath, relativePath)));

  for (const status of statuses) {
    if (status.kind !== 'cached') continue;
    const row = toMetaRow(collectionPath, { relativePath: status.relativePath, ...status.entry });
    if (row) writes.add(() => writes.time('si', () => searchIndex.upsertMeta(row)));
  }

  for (const { relativePath, format, type } of statuses.filter((s) => s.kind === 'stale')) {
    let result;
    try {
      result = await getPool().runOnce(JobType.ParseFile, { collectionPath, relativePath, format, type });
    } catch (err) {
      result = await failedResult(collectionPath, relativePath, err);
    }
    if (!result) continue;

    // A naming file that cannot be parsed gives no name, but its mtime and hash are kept so it is not read again
    const row = toMetaRow(collectionPath, result);
    if (row) writes.add(() => writes.time('si', () => searchIndex.upsertMeta(row)));
    if (result.error) continue;
    if (fileIndex) {
      writes.add(() => {
        try {
          writes.time('fi', () => fileIndex.stage(collectionPath, {
            op: 'add',
            relativePath,
            mtime: result.mtime,
            hash: result.hash,
            data: result.data,
            raw: result.raw
          }));
        } catch (_) {}
      });
    }
  }

  writes.flush();
};

const MODE_LABELS = { quick: 'pass 1 meta', fill: 'pass 2 full', complete: 'full' };

const indexUncached = async (searchIndex, collectionPath, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork, mode, shouldStop) => {
  const runStart = performance.now();
  const logLabel = `${collectionName} (${MODE_LABELS[mode]})`;
  const folderPaths = [];
  const allFiles = walk(collectionPath, resolveDenylist(denylist), folderPaths)
    .map((f) => ({ ...f, cls: defaultClassify(f.relativePath) }));
  const files = allFiles.filter((f) => f.cls?.type === 'request');
  const metaFiles = selectNamingFiles(collectionPath, allFiles);
  const stored = searchIndex.entriesFor(collectionPath);

  // Every folder is known to the index, empty ones too, so a folder can be searched for by its name
  searchIndex.syncFolders({
    collectionPath,
    collectionName,
    workspacePath,
    folderPaths: withParentFolders(folderPaths)
  });

  const writes = createWriteBatch(searchIndex);

  // Names first: they are a few small files, and every row's collection and folder name depends on them
  await indexMetadata(searchIndex, collectionPath, metaFiles, fileIndex, onWork, writes);

  const failed = mode === 'fill'
    ? new Set(searchIndex.rowsForCollection(collectionPath).filter((row) => row.requestError).map((row) => row.requestPath))
    : null;

  const statuses = await Promise.all(files.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);

    if (mode === 'fill') {
      if (fileIndex?.mtimeFor(collectionPath, relativePath) === stat.mtimeNs) {
        if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
        const cachedCopy = fileIndex.entryFor(collectionPath, relativePath);
        if (cachedCopy) return { kind: 'cached', relativePath, entry: cachedCopy };
      }
      if (prior && prior.mtime === stat.mtimeNs && failed.has(relativePath)) return { kind: 'unchanged', relativePath };
      return { kind: 'stale', relativePath, format: cls.format };
    }

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

  for (const relativePath of removed) writes.add(() => writes.time('si', () => searchIndex.remove(collectionPath, relativePath)));

  for (const status of statuses) {
    if (status.kind !== 'cached') continue;
    writes.add(() => writes.time('si', () => searchIndex.upsert(toRow(collectionPath, collectionName, { relativePath: status.relativePath, ...status.entry }, workspacePath))));
  }

  const toParse = statuses.filter((s) => s.kind === 'stale');
  if (!toParse.length) {
    writes.flush();
    if (writes.stats.writes) logRunSummary(logLabel, writes.stats, runStart);
    return;
  }

  const pool = getPool();
  const writeMsBeforeParse = writes.stats.ms;
  const parseStart = performance.now();
  const loopBeforeParse = performance.eventLoopUtilization();
  let yieldedAtBatch = 0;
  await runWithConcurrency(toParse, concurrency, async ({ relativePath, format }) => {
    if (shouldStop?.()) return;

    // One file that cannot be parsed never stops the others
    let result;
    try {
      result = await pool.runOnce(JobType.ParseFile, {
        collectionPath,
        relativePath,
        format,
        type: 'request',
        metaOnly: mode === 'quick',
        keepMetaOnError: mode !== 'complete'
      });
    } catch (err) {
      result = await failedResult(collectionPath, relativePath, err);
    }
    if (!result) return;

    // A file that could not be parsed still gets a row (what could be read from it, plus the error), so it can be
    // found, shows the error mark, and is not read again until it changes. It is not saved in the file index.
    writes.add(() => {
      writes.time('si', () => searchIndex.upsert(toRow(collectionPath, collectionName, result, workspacePath)));
      if (result.error || result.metaOnly || !fileIndex) return;
      try {
        writes.time('fi', () => fileIndex.stage(collectionPath, {
          op: 'add',
          relativePath,
          mtime: result.mtime,
          hash: result.hash,
          data: result.data,
          raw: result.raw
        }));
      } catch (_) {}
    });

    if (mode === 'fill' && writes.stats.batches !== yieldedAtBatch) {
      yieldedAtBatch = writes.stats.batches;
      await new Promise((resolve) => setImmediate(resolve));
    }
  });
  const parsePhaseMs = performance.now() - parseStart;
  const parseLoop = performance.eventLoopUtilization(performance.eventLoopUtilization(), loopBeforeParse);
  const writeMsInsideParse = writes.stats.ms - writeMsBeforeParse;
  writes.flush();
  logRunSummary(logLabel, writes.stats, runStart, {
    ms: parsePhaseMs - writeMsInsideParse,
    files: toParse.length,
    wallMs: parsePhaseMs,
    activeMs: parseLoop.active,
    writeMs: writeMsInsideParse
  });
};

// One run per collection at a time; a request that arrives mid-run joins it instead of walking and parsing again
const activeRuns = new Map();

// onWork is called once the run finds something to read or write (not while it is only checking for changes)
const indexCollection = (searchIndex, { collectionPath, collectionName, denylist, concurrency = os.availableParallelism(), workspacePath, fileIndex, onWork, mode = 'complete', shouldStop }) => {
  const root = path.resolve(collectionPath);
  const running = activeRuns.get(root);
  if (running) return running;

  const run = indexUncached(searchIndex, root, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork, fileIndex ? mode : 'complete', shouldStop)
    .finally(() => activeRuns.delete(root));
  activeRuns.set(root, run);
  return run;
};

module.exports = { indexCollection, toRow, toMetaRow, isIndexedFolder, withParentFolders };
