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
  return { collectionPath, relativePath, kind: type, folderPath, ...metaFrom(type, data), mtime, hash };
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

// Keeps the collection and folder names/order in step with their files, the same way requests are kept in step:
// unchanged files are skipped, then the file index is tried, and only then is the file read again.
const indexMetadata = async (searchIndex, collectionPath, metaFiles, cached, fileIndex, onWork) => {
  const stored = searchIndex.metaEntriesFor(collectionPath);

  const statuses = await Promise.all(metaFiles.map(async ({ relativePath, absolutePath, cls }) => {
    const stat = await fs.promises.stat(absolutePath, { bigint: true });
    const prior = stored.get(relativePath);
    if (prior && prior.mtime === stat.mtimeNs) return { kind: 'unchanged', relativePath };
    if (prior) {
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
    }

    const cachedEntry = cached?.get(relativePath);
    if (cachedEntry && cachedEntry.mtime === stat.mtimeNs) return { kind: 'cached', relativePath, entry: cachedEntry };

    return { kind: 'stale', relativePath, format: cls.format, type: cls.type };
  }));

  const seen = new Set(statuses.map((s) => s.relativePath));
  const removed = [...stored.keys()].filter((relativePath) => !seen.has(relativePath));
  if (removed.length || statuses.some((s) => s.kind !== 'unchanged')) onWork?.();

  for (const relativePath of removed) searchIndex.removeMeta(collectionPath, relativePath);

  for (const status of statuses) {
    if (status.kind !== 'cached') continue;
    const row = toMetaRow(collectionPath, { relativePath: status.relativePath, ...status.entry });
    if (row) searchIndex.upsertMeta(row);
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
    if (row) searchIndex.upsertMeta(row);
    if (result.error) continue;
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
  }
};

const indexUncached = async (searchIndex, collectionPath, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork) => {
  const folderPaths = [];
  const allFiles = walk(collectionPath, resolveDenylist(denylist), folderPaths)
    .map((f) => ({ ...f, cls: defaultClassify(f.relativePath) }));
  const files = allFiles.filter((f) => f.cls?.type === 'request');
  const metaFiles = allFiles.filter((f) => toMetaRow(collectionPath, { relativePath: f.relativePath }));
  const stored = searchIndex.entriesFor(collectionPath);
  const cached = fileIndex ? fileIndex.entries(collectionPath) : null;

  // Every folder is known to the index, empty ones too, so a folder can be searched for by its name
  searchIndex.syncFolders({
    collectionPath,
    collectionName,
    workspacePath,
    folderPaths: withParentFolders(folderPaths)
  });

  // Names first: they are a few small files, and every row's collection and folder name depends on them
  await indexMetadata(searchIndex, collectionPath, metaFiles, cached, fileIndex, onWork);

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
  const removed = [...stored.keys()].filter((relativePath) => !seen.has(relativePath));
  if (removed.length || statuses.some((s) => s.kind !== 'unchanged')) onWork?.();

  for (const relativePath of removed) searchIndex.remove(collectionPath, relativePath);

  for (const status of statuses) {
    if (status.kind !== 'cached') continue;
    searchIndex.upsert(toRow(collectionPath, collectionName, { relativePath: status.relativePath, ...status.entry }, workspacePath));
  }

  const toParse = statuses.filter((s) => s.kind === 'stale');
  if (!toParse.length) return;

  const pool = getPool();
  await runWithConcurrency(toParse, concurrency, async ({ relativePath, format }) => {
    // One file that cannot be parsed never stops the others
    let result;
    try {
      result = await pool.runOnce(JobType.ParseFile, { collectionPath, relativePath, format, type: 'request' });
    } catch (err) {
      result = await failedResult(collectionPath, relativePath, err);
    }
    if (!result) return;

    // A file that could not be parsed still gets a row (what could be read from it, plus the error), so it can be
    // found, shows the error mark, and is not read again until it changes. It is not saved in the file index.
    searchIndex.upsert(toRow(collectionPath, collectionName, result, workspacePath));
    if (result.error || !fileIndex) return;
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
  });
};

// One run per collection at a time; a request that arrives mid-run joins it instead of walking and parsing again
const activeRuns = new Map();

// onWork is called once the run finds something to read or write (not while it is only checking for changes)
const indexCollection = (searchIndex, { collectionPath, collectionName, denylist, concurrency = BACKGROUND_INDEX_CONCURRENCY, workspacePath, fileIndex, onWork }) => {
  const root = normalize(collectionPath);
  const running = activeRuns.get(root);
  if (running) return running;

  const run = indexUncached(searchIndex, root, collectionName, denylist, concurrency, workspacePath, fileIndex, onWork)
    .finally(() => activeRuns.delete(root));
  activeRuns.set(root, run);
  return run;
};

module.exports = { indexCollection, toRow, toMetaRow, isIndexedFolder, withParentFolders, BACKGROUND_INDEX_CONCURRENCY };
