const fs = require('node:fs');
const path = require('node:path');
const { utilityProcess } = require('electron');
const { FileIndex } = require('../mount/file-index');
const { buildTree } = require('../mount/tree-builder');
const { defaultClassify, hashFileAsync, FOLDER_ROOT_BASENAMES } = require('../../utils/mount');
const { preferencesUtil } = require('../../store/preferences');
const { getPool, JobType, JobPriority } = require('../pool');
const { getSearchIndex } = require('../search-index');
const { ingestParsedFile } = require('../search-index/ingest');

const RIPGREP_PROCESS_FILE = path.join(__dirname, 'ripgrep-process.js');
const STATUS_INTERVAL_MS = 150;

const toTreeEntry = (relativePath, data = {}, error) => {
  let treeData;
  if (defaultClassify(relativePath)?.type === 'folder') {
    const meta = data.meta || data.info || {};
    treeData = { meta: { name: meta.name, seq: meta.seq } };
  } else {
    treeData = {
      name: data.name,
      type: data.type,
      seq: data.seq,
      request: { method: data.request?.method, url: data.request?.url }
    };
  }
  return error ? { data: treeData, error: { message: error.message } } : { data: treeData };
};

const dataFromIndexRow = (row) => ({
  name: row.requestName,
  type: row.requestProtocol || 'http-request',
  seq: row.requestSeq,
  request: { method: row.requestType, url: row.requestUrl }
});

const withFolderFiles = (probedDirs, relativePaths) => {
  const files = new Set(relativePaths);
  for (const relativePath of relativePaths) {
    for (let dir = path.dirname(relativePath); dir !== '.' && !probedDirs.has(dir); dir = path.dirname(dir)) {
      probedDirs.add(dir);
      for (const basename of FOLDER_ROOT_BASENAMES) files.add(path.join(dir, basename));
    }
  }
  return [...files];
};

const isIndexedVersion = async (absolutePath, indexed) => {
  const stat = await fs.promises.stat(absolutePath, { bigint: true });
  if (indexed.mtime !== null && indexed.mtime !== undefined && BigInt(indexed.mtime) === stat.mtimeNs) return true;
  return Boolean(indexed.hash) && (await hashFileAsync(absolutePath)) === indexed.hash;
};

class SearchService {
  #host = null;
  #onMessage = null;
  #nextId = 0;
  #active = null;
  #window = null;
  #fileIndex = null;
  #ingestQueue = [];
  #statusTimer = null;

  #getHost() {
    if (this.#host) return this.#host;

    const host = utilityProcess.fork(RIPGREP_PROCESS_FILE, [], { serviceName: 'Bruno Search' });
    host.on('message', (message) => {
      const active = this.#active;
      if (!active || message.id !== active.id) return;
      if (message.type === 'batch') {
        this.#onMessage?.(message);
        this.#backfill(active, message.root, message.paths);
        return;
      }
      if (message.type === 'done') {
        active.searching = false;
        this.#settle(active);
      }
    });
    host.on('exit', () => {
      if (this.#host !== host) return;
      this.#host = null;
      const active = this.#active;
      if (active?.searching) {
        active.searching = false;
        this.#settle(active);
      }
    });

    this.#host = host;
    return host;
  }

  #getFileIndex() {
    if (!this.#fileIndex) this.#fileIndex = new FileIndex();
    return this.#fileIndex;
  }

  countIndexMatches(roots, query) {
    if (!preferencesUtil.isSearchIndexEnabled() || !query) return 0;
    try {
      const searchIndex = getSearchIndex();
      return roots.reduce(
        (sum, root) => sum + searchIndex.countRequestsInCollection(query, root),
        0
      );
    } catch (err) {
      console.warn('[search] match count unavailable', err);
      return 0;
    }
  }

  #emitStatus() {
    clearTimeout(this.#statusTimer);
    this.#statusTimer = null;
    this.#flushIngest();
    const active = this.#active;
    if (!active) return;
    this.#onMessage?.({
      type: 'status',
      id: active.id,
      indexing: active.searching || active.pending > 0,
      matchCount: this.countIndexMatches(active.roots, active.query)
    });
  }

  #scheduleStatus() {
    if (this.#statusTimer) return;
    this.#statusTimer = setTimeout(() => this.#emitStatus(), STATUS_INTERVAL_MS);
    this.#statusTimer.unref?.();
  }

  #settle(active) {
    if (this.#active !== active) {
      this.#scheduleStatus();
      return;
    }
    if (!active.searching && active.pending === 0) this.#emitStatus();
    else this.#scheduleStatus();
  }

  search({ roots, query }, onMessage) {
    this.#stopActive();
    const id = ++this.#nextId;
    this.#window = null;
    this.#onMessage = onMessage;
    this.#active = { id, roots, query, searching: true, pending: 0, jobs: new Map(), versions: new Map() };
    this.#emitStatus();
    this.#getHost().postMessage({ type: 'search', id, roots, query });
    return id;
  }

  cancel() {
    this.#stopActive();
    this.#window = null;
    this.#onMessage = null;
    this.#host?.postMessage({ type: 'cancel' });
  }

  #stopActive() {
    const active = this.#active;
    if (!active) return;
    this.#active = null;
    const queued = [...active.jobs.values()].map((job) => job.promise);
    if (queued.length) getPool().cancelQueued(queued);
  }

  async #backfill(active, root, relativePaths) {
    if (!relativePaths.length) return;

    active.pending += 1;
    try {
      const unindexed = await this.#unindexed(active, root, relativePaths);
      if (this.#active !== active) return;
      for (const relativePath of unindexed) this.#schedule(active, root, relativePath, JobPriority.index);
    } catch (err) {
      console.warn('[search] backfill failed', err);
    } finally {
      active.pending -= 1;
      this.#settle(active);
    }
  }

  async #unindexed(active, root, relativePaths) {
    let versions = active.versions.get(root);
    if (!versions) {
      versions = getSearchIndex().entriesFor(root);
      active.versions.set(root, versions);
    }
    const results = await Promise.all(relativePaths.map(async (relativePath) => {
      const indexed = versions.get(relativePath);
      if (!indexed) return relativePath;
      try {
        return (await isIndexedVersion(path.join(root, relativePath), indexed)) ? null : relativePath;
      } catch (_) {
        return null;
      }
    }));
    return results.filter(Boolean);
  }

  #schedule(active, collectionPath, relativePath, priority) {
    const key = `${collectionPath}\0${relativePath}`;
    const existing = active.jobs.get(key);
    if (existing) {
      if (priority < existing.priority && getPool().prioritize([existing.promise], priority)) existing.priority = priority;
      return existing.result;
    }

    const promise = getPool().run(
      JobType.ParseFile,
      { collectionPath, relativePath, ...defaultClassify(relativePath) },
      { priority }
    );
    const job = { promise, priority };
    active.jobs.set(key, job);
    active.pending += 1;
    job.result = Promise.resolve(promise)
      .then((result) => {
        this.#queueIngest(collectionPath, result);
        return result;
      }, () => null)
      .finally(() => {
        active.jobs.delete(key);
        active.pending -= 1;
        this.#settle(active);
      });
    return job.result;
  }

  #queueIngest(collectionPath, result) {
    this.#ingestQueue.push({ collectionPath, result });
    this.#scheduleStatus();
  }

  #flushIngest() {
    if (!this.#ingestQueue.length) return;
    const queue = this.#ingestQueue;
    this.#ingestQueue = [];
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const fileIndex = preferencesUtil.isFileCacheEnabled() ? this.#getFileIndex() : null;
    try {
      const searchIndex = getSearchIndex();
      searchIndex.transaction(() => {
        for (const { collectionPath, result } of queue) {
          ingestParsedFile({
            searchIndex,
            fileIndex,
            collectionPath,
            collectionName: path.basename(collectionPath),
            result
          });
        }
      });
    } catch (err) {
      console.warn('[search] failed to persist search index', err);
    }
  }

  async resolveWindow({ id, collectionPath, relativePaths }) {
    const active = this.#active;
    if (!active || id !== active.id) return { stale: true };
    this.#flushIngest();
    if (this.#window?.id !== id) this.#window = { id, collections: new Map() };
    let collection = this.#window.collections.get(collectionPath);
    if (!collection) {
      collection = { resolved: new Set(), probedDirs: new Set() };
      this.#window.collections.set(collectionPath, collection);
    }

    const wanted = withFolderFiles(collection.probedDirs, relativePaths).filter((relativePath) => !collection.resolved.has(relativePath));
    const windowEntries = new Map();
    const toParse = [];

    const searchIndex = getSearchIndex();
    const rowsByPath = new Map(
      searchIndex.rowsForCollection(collectionPath).map((row) => [row.requestPath, row])
    );
    const foldersByPath = new Map(
      searchIndex.foldersFor(collectionPath).map((row) => [row.folderPath, row])
    );

    const fromIndex = (relativePath) => {
      if (defaultClassify(relativePath)?.type === 'folder') {
        const folder = foldersByPath.get(path.dirname(relativePath));
        return folder && { meta: { name: folder.name, seq: folder.seq } };
      }
      const row = rowsByPath.get(relativePath);
      return row && dataFromIndexRow(row);
    };

    for (const relativePath of wanted) {
      const data = fromIndex(relativePath);
      if (data) {
        windowEntries.set(relativePath, toTreeEntry(relativePath, data));
      } else {
        toParse.push(relativePath);
      }
    }

    const parsed = await Promise.all(toParse.map((relativePath) => this.#schedule(active, collectionPath, relativePath, JobPriority.search)));
    if (this.#active !== active) return { stale: true };

    for (const result of parsed) {
      if (result) windowEntries.set(result.relativePath, toTreeEntry(result.relativePath, result.data, result.error));
    }
    for (const relativePath of windowEntries.keys()) collection.resolved.add(relativePath);

    const { getRequestUid } = require('../../cache/requestUids');
    return { items: buildTree(collectionPath, windowEntries, { uidFor: getRequestUid }).items };
  }

  shutdown() {
    clearTimeout(this.#statusTimer);
    this.#statusTimer = null;
    this.#active = null;
    this.#onMessage = null;
    const host = this.#host;
    this.#host = null;
    host?.kill();
  }
}

module.exports = { SearchService };
