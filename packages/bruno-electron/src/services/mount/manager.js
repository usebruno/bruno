const fs = require('node:fs');
const path = require('node:path');
const { JobType, getPool, destroyPool } = require('../pool');
const { FileIndex } = require('./file-index');
const { buildTree } = require('./tree-builder');
const { defaultClassify, uidForSeed } = require('../../utils/mount');
const { getWsClient } = require('../../ipc/network/ws-event-handlers');
const { SearchIndex } = require('../search-index');
const { withParentFolders } = require('../search-index/indexer');
const { indexCollection } = require('../search-index/indexer');
const { ingestParsedFile, ingestCachedFile, removeFromSearchIndex } = require('../search-index/ingest');
const { preferencesUtil } = require('../../store/preferences');
const { discoverCollections, cancelDiscovery, shutdownRipgrepHost } = require('../search-index/ripgrep-host');
const { collectionNameMatches } = require('../search-index/search-term');

// cold start only — collection-watcher handles live changes and writes through to the cache

let _envSecretsStore = null;
const getEnvSecretsStore = () => {
  if (!_envSecretsStore) {
    const EnvironmentSecretsStore = require('../../store/env-secrets');
    _envSecretsStore = new EnvironmentSecretsStore();
  }
  return _envSecretsStore;
};

const envHasSecrets = (env) => Array.isArray(env?.variables) && env.variables.some((v) => v.secret);

const hydrateEnvironments = (collectionPath, environments) => {
  if (!Array.isArray(environments)) return;
  const { decryptStringSafe } = require('../../utils/encryption');
  for (const env of environments) {
    if (!Array.isArray(env.variables)) continue;
    env.variables.forEach((variable, i) => {
      variable.uid = uidForSeed(`${env.uid}#var#${i}#${variable.name || ''}`);
    });
    if (!envHasSecrets(env)) continue;
    try {
      const envSecrets = getEnvSecretsStore().getEnvSecrets(collectionPath, env);
      for (const secret of envSecrets || []) {
        const variable = env.variables.find((v) => v.name === secret.name && v.secret);
        if (variable && secret.value) {
          const decrypted = decryptStringSafe(secret.value);
          variable.value = decrypted.value;
        }
      }
    } catch (err) {
      console.error('[mount] env secret hydration failed', err);
    }
  }
};

const sendTree = async (collectionUid, collectionPath, tree, emit) => {
  if (tree.brunoConfig) {
    try {
      const { transformBrunoConfigAfterRead } = require('../../utils/transformBrunoConfig');
      const { setBrunoConfig } = require('../../store/bruno-config');
      const transformed = await transformBrunoConfigAfterRead(tree.brunoConfig, collectionPath);
      tree.brunoConfig = transformed;
      setBrunoConfig(collectionUid, transformed);
      emit.config(transformed);
    } catch (err) {
      console.error(`[mount:${collectionUid}] brunoConfig transform failed:`, err);
    }
  }
  hydrateEnvironments(collectionPath, tree.environments);
  emit.tree(tree);
};

const ensureTransientDirectory = () => {
  const base = path.join(require('electron').app.getPath('userData'), 'tmp', 'transient');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, 'bruno-'));
};

class MountManager {
  #index = null;
  #searchIndex = null;
  #mounts = new Map();
  /** @type {{
   * workspacePath: string,
   * term: string,
   * signature: string,
   * completed: number,
   * total: number | null,
   * isDiscovering: boolean,
   * discoveryId: number | null,
   * promise: Promise<void>,
   * queue: { root: string, collectionName: string, denylist: string[] }[],
   * discovered: Set<string>,
   * indexing: boolean
   * } | null} */
  #activeBatch = null;
  #discoveryCache = new Map();
  /** @type {Map<string, Set<string>>} */
  #discoveredRootsByQuery = new Map();
  /** @type {Set<string>} */
  #candidatePathsForSearch = new Set();
  #searchTerm = '';

  #queryDiscoveryKey(workspacePath, term) {
    return `${workspacePath}\n${term}`;
  }

  async mount({ win, collectionPath, collectionUid, brunoConfig, emit, workspacePath }) {
    collectionPath = path.resolve(collectionPath);

    if (this.#mounts.has(collectionUid)) {
      // renderer reload — pull fresh state from cache and re-emit
      const existing = this.#mounts.get(collectionUid);
      existing.win = win;
      existing.emit = emit;
      existing.brunoConfig = brunoConfig || existing.brunoConfig;
      existing.state = this.#getPersistentIndex().entries(existing.collectionPath, { denylist: existing.brunoConfig?.ignore });
      await this.#emitTree(collectionUid, existing);
      return existing.tempDirectoryPath;
    }

    const tempDirectoryPath = ensureTransientDirectory();
    fs.writeFileSync(path.join(tempDirectoryPath, 'metadata.json'), JSON.stringify({ collectionPath }));

    const entry = {
      state: new Map(),
      collectionPath,
      tempDirectoryPath,
      brunoConfig,
      win,
      emit
    };
    this.#mounts.set(collectionUid, entry);

    entry.emit.loading(true);
    try {
      // This is the file-cache ON path, so it always works against the persistent file index
      const indexOptions = {
        ...(await this.getWatcherIndexOptions(collectionPath, workspacePath)),
        fileIndex: this.#getPersistentIndex()
      };
      // with the mtime/hash each copy was saved with, so the search index can tell which rows are still current
      entry.state = indexOptions.fileIndex.entriesWithMetadata(collectionPath, { denylist: brunoConfig?.ignore });
      await this.#reconcile(entry, indexOptions);
      await this.#emitTree(collectionUid, entry);

      const collectionWatcher = require('../../app/collection-watcher');
      collectionWatcher.addWatcher(entry.win, collectionPath, collectionUid, brunoConfig, false, false, {
        ignoreInitial: true,
        ...indexOptions
      });
      collectionWatcher.addTempDirectoryWatcher(entry.win, tempDirectoryPath, collectionUid, collectionPath);
    } catch (err) {
      this.#mounts.delete(collectionUid);
      throw err;
    } finally {
      entry.emit.loading(false);
    }
    return tempDirectoryPath;
  }

  async unmount(collectionUid) {
    try {
      getWsClient()?.closeForCollection(collectionUid);
    } catch (_) {}

    const entry = this.#mounts.get(collectionUid);
    if (!entry) return;
    this.#mounts.delete(collectionUid);
    const collectionWatcher = require('../../app/collection-watcher');
    try {
      collectionWatcher.removeWatcher(entry.collectionPath, entry.win, collectionUid);
    } catch (_) {}
  }

  async shutdown({ force = false } = {}) {
    await Promise.all(
      Array.from(this.#mounts.keys()).map((uid) => this.unmount(uid).catch(() => {}))
    );
    await destroyPool({ force }).catch(() => {});
    shutdownRipgrepHost();
    // both indexes run on the shared database, which the sqlite service closes
    this.#index = null;
    this.#searchIndex = null;
    this.#activeBatch = null;
    this.#candidatePathsForSearch = new Set();
  }

  getSearchIndexSize() {
    return this.#getSearchIndex().size();
  }

  // Indexes the watcher keeps in sync with live edits. The file index only exists while the file cache is ON,
  // and the search index is only wired up (with the workspace its rows are scoped to) when search indexing is enabled.
  async getWatcherIndexOptions(collectionPath, workspacePath) {
    const searchIndexEnabled = preferencesUtil.isSearchIndexEnabled();
    return {
      fileIndex: this.#getIndex(),
      searchIndex: searchIndexEnabled ? this.#getSearchIndex() : null,
      workspacePathname: searchIndexEnabled ? await this.#resolveWorkspacePath(collectionPath, workspacePath) : null
    };
  }

  clearSearchIndex() {
    this.#getSearchIndex().clear();
  }

  searchIndex(term, options = {}) {
    return this.#getSearchIndex().search(term, options);
  }

  async searchIndexTrees(term, workspacePath, knownRevision, { limit, collectionPaths } = {}) {
    const searchIndex = this.#getSearchIndex();
    const revision = searchIndex.revision;
    const indexing = this.getIndexingStatus().isIndexing;
    if (knownRevision === revision) return { revision, unchanged: true, indexing };

    let matches = [];
    let total = 0;
    if (Number.isInteger(limit) && Array.isArray(collectionPaths)) {
      const scopedPaths = collectionPaths.filter((collectionPath) => {
        const root = path.resolve(collectionPath);
        if (!this.#searchTerm || term !== this.#searchTerm) return true;
        return this.#candidatePathsForSearch.has(root);
      });
      for (const collectionPath of scopedPaths) {
        const root = path.resolve(collectionPath);
        total += searchIndex.countRequestsInCollection(term, root, { workspacePath });
        if (matches.length < limit) {
          matches = matches.concat(searchIndex.searchRequestsInCollection(term, root, { workspacePath, limit: limit - matches.length }));
        }
      }
    } else {
      matches = this.searchIndex(term, { scope: 'request', workspacePath });
      total = matches.length;
    }

    const byCollection = new Map();
    for (const row of matches) {
      if (!byCollection.has(row.collectionPath)) byCollection.set(row.collectionPath, []);
      byCollection.get(row.collectionPath).push(row);
    }

    const trees = {};
    for (const [collectionPath, rows] of byCollection) {
      trees[collectionPath] = this.#buildTreeFromIndexRows(collectionPath, rows, { onlyFoldersWithRows: true });
    }
    return { revision, trees, total, loaded: matches.length, indexing };
  }

  async indexCollectionInBackground({ collectionPath, collectionName, workspacePath }) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const root = path.resolve(collectionPath);
    if (this.#isMounted(root)) return;
    const resolvedWorkspacePath = await this.#resolveWorkspacePath(root, workspacePath);
    await indexCollection(this.#getSearchIndex(), {
      collectionPath: root,
      collectionName,
      workspacePath: resolvedWorkspacePath,
      fileIndex: this.#getIndex(),
      onWrite: () => this.#broadcast('main:search-index-written')
    });
  }

  #isMounted(root) {
    return Array.from(this.#mounts.values()).some((entry) => entry.collectionPath === root);
  }

  #collectionsSignature(collections) {
    return JSON.stringify((collections || []).map((c) => path.resolve(c.path)).sort());
  }

  #discoveryCacheKey(workspacePath, term, signature) {
    return `${workspacePath}\n${term}\n${signature}`;
  }

  #enqueueCandidate(batch, entry) {
    const root = path.resolve(entry.root ?? entry.path);
    if (batch.discovered.has(root)) return;
    batch.discovered.add(root);
    this.#candidatePathsForSearch.add(root);
    batch.queue.push({
      root,
      collectionName: entry.collectionName ?? entry.name,
      denylist: entry.denylist ?? entry.ignore ?? []
    });
    this.#broadcastIndexingStatus();
    this.#pumpIndexQueue(batch);
  }

  async #pumpIndexQueue(batch) {
    if (batch.indexing || this.#activeBatch !== batch) return;
    batch.indexing = true;
    const fileIndex = this.#getIndex();
    const searchIndex = this.#getSearchIndex();
    try {
      while (batch.queue.length > 0 && this.#activeBatch === batch) {
        const next = batch.queue.shift();
        await indexCollection(searchIndex, {
          collectionPath: next.root,
          collectionName: next.collectionName,
          denylist: next.denylist,
          workspacePath: batch.workspacePath,
          fileIndex,
          onWrite: () => this.#broadcast('main:search-index-written')
        }).catch(() => {});
        if (this.#activeBatch !== batch) return;
        batch.completed += 1;
        this.#broadcastIndexingStatus();
      }
    } finally {
      batch.indexing = false;
      if (this.#activeBatch === batch && batch.queue.length > 0) {
        this.#pumpIndexQueue(batch);
        return;
      }
      if (this.#activeBatch === batch && !batch.isDiscovering && batch.queue.length === 0) {
        this.#activeBatch = null;
        this.#broadcastIndexingStatus();
      }
    }
  }

  async #runQueryIndexJob(collections, workspacePath, term) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const normalizedTerm = (term || '').trim();
    if (!normalizedTerm) return;

    const resolvedWorkspace = workspacePath ? path.resolve(workspacePath) : '';
    const unmounted = (collections || [])
      .map(({ path: collectionPath, name, ignore }) => ({
        path: path.resolve(collectionPath),
        name,
        ignore
      }))
      .filter((c) => !this.#isMounted(c.path));

    const signature = this.#collectionsSignature(unmounted);
    const cacheKey = this.#discoveryCacheKey(resolvedWorkspace, normalizedTerm, signature);
    const cached = this.#discoveryCache.get(cacheKey);

    const batch = {
      workspacePath: resolvedWorkspace,
      term: normalizedTerm,
      signature,
      completed: 0,
      total: cached ? cached.length : null,
      isDiscovering: !cached,
      discoveryId: null,
      promise: null,
      queue: [],
      discovered: new Set(),
      indexing: false
    };

    this.#searchTerm = normalizedTerm;
    this.#candidatePathsForSearch = new Set(cached || []);
    this.#activeBatch = batch;
    this.#broadcastIndexingStatus();

    const runPromise = (async () => {
      try {
        const ordered = unmounted.map((c) => ({
          root: c.path,
          collectionName: c.name,
          denylist: c.ignore,
          path: c.path,
          name: c.name,
          ignore: c.ignore
        }));

        if (cached) {
          for (const root of cached) {
            const entry = ordered.find((c) => path.resolve(c.root) === root);
            if (entry) this.#enqueueCandidate(batch, entry);
          }
          this.#discoveredRootsByQuery.set(
            this.#queryDiscoveryKey(resolvedWorkspace, normalizedTerm),
            new Set(cached)
          );
          return;
        }

        for (const entry of ordered) {
          if (collectionNameMatches(entry.name, normalizedTerm)) {
            this.#enqueueCandidate(batch, entry);
          }
        }

        const { id, promise } = discoverCollections({
          term: normalizedTerm,
          collections: ordered.map((c) => ({ path: c.path, name: c.name, ignore: c.ignore })),
          onCandidate: (collectionPath) => {
            if (this.#activeBatch !== batch) return;
            const entry = ordered.find((c) => path.resolve(c.path) === path.resolve(collectionPath));
            if (entry) this.#enqueueCandidate(batch, entry);
          }
        });
        batch.discoveryId = id;
        await promise.catch(() => {});
        if (this.#activeBatch !== batch) return;
        batch.isDiscovering = false;
        batch.total = batch.discovered.size;
        this.#discoveryCache.set(cacheKey, [...batch.discovered]);
        this.#discoveredRootsByQuery.set(
          this.#queryDiscoveryKey(resolvedWorkspace, normalizedTerm),
          new Set(batch.discovered)
        );
        this.#broadcastIndexingStatus();
      } finally {
        if (this.#activeBatch === batch && !batch.isDiscovering && batch.queue.length === 0 && !batch.indexing) {
          this.#activeBatch = null;
          this.#broadcastIndexingStatus();
        }
      }
    })();

    batch.promise = runPromise;
    return runPromise;
  }

  async indexManyCollectionsInBackground(collections, workspacePath, term) {
    const resolvedWorkspace = workspacePath ? path.resolve(workspacePath) : '';
    const normalizedTerm = (term || '').trim();
    const signature = this.#collectionsSignature(collections);
    if (
      this.#activeBatch
      && this.#activeBatch.workspacePath === resolvedWorkspace
      && this.#activeBatch.term === normalizedTerm
      && this.#activeBatch.signature === signature
      && this.#activeBatch.promise
    ) {
      return this.#activeBatch.promise;
    }
    if (this.#activeBatch?.discoveryId != null) {
      cancelDiscovery(this.#activeBatch.discoveryId);
    }
    const unmounted = (collections || [])
      .map(({ path: collectionPath }) => path.resolve(collectionPath))
      .filter((root) => !this.#isMounted(root));
    const knownRoots = this.#discoveredRootsByQuery.get(this.#queryDiscoveryKey(resolvedWorkspace, normalizedTerm));
    if (knownRoots && !this.#activeBatch && unmounted.length > 0 && unmounted.every((root) => knownRoots.has(root))) {
      this.#searchTerm = normalizedTerm;
      this.#candidatePathsForSearch = new Set(knownRoots);
      return Promise.resolve();
    }
    return this.#runQueryIndexJob(collections, workspacePath, normalizedTerm);
  }

  getIndexingStatus() {
    if (!this.#activeBatch) {
      return { isIndexing: false, isDiscovering: false, completed: 0, total: 0 };
    }
    const { completed, total, isDiscovering, queue, indexing } = this.#activeBatch;
    const isIndexing = isDiscovering || queue.length > 0 || indexing || (total != null && completed < total);
    return {
      isIndexing,
      isDiscovering,
      completed,
      total: isDiscovering && total == null ? null : (total ?? 0)
    };
  }

  clearCollectionIndex(collectionPath) {
    const root = path.resolve(collectionPath);
    this.#getPersistentIndex().clearCollection(root);
    this.#getSearchIndex().clearCollection(root);
  }

  async #reconcile(entry, indexOptions) {
    const { fileIndex } = indexOptions;
    const denylist = entry.brunoConfig?.ignore || [];
    const { added, updated, removed } = await fileIndex.status(entry.collectionPath, { denylist });

    const toParse = [];
    for (const e of [...added, ...updated]) {
      const cls = defaultClassify(e.relativePath);
      if (!cls) continue;
      toParse.push({ relativePath: e.relativePath, format: cls.format, type: cls.type });
    }

    const parsed = new Map();
    if (toParse.length > 0) {
      const pool = getPool();
      await Promise.allSettled(
        toParse.map(async (e) => {
          try {
            const result = await pool.runOnce(JobType.ParseFile, {
              collectionPath: entry.collectionPath,
              relativePath: e.relativePath,
              format: e.format,
              type: e.type
            });
            parsed.set(e.relativePath, result);
          } catch (err) {
            parsed.set(e.relativePath, {
              relativePath: e.relativePath,
              error: { message: err.message, stack: err.stack }
            });
          }
        })
      );
    }

    fileIndex.transaction(() => {
      for (const e of toParse) {
        const result = parsed.get(e.relativePath);
        if (!result) continue;
        if (result.error) {
          entry.state.set(e.relativePath, { data: result.data, error: result.error, raw: result.raw });
          continue;
        }
        entry.state.set(e.relativePath, { data: result.data, raw: result.raw });
        fileIndex.stage(entry.collectionPath, {
          op: 'add',
          relativePath: e.relativePath,
          mtime: result.mtime,
          hash: result.hash,
          data: result.data,
          raw: result.raw
        });
      }
      for (const e of removed) {
        entry.state.delete(e.relativePath);
        fileIndex.stage(entry.collectionPath, { op: 'remove', relativePath: e.relativePath });
      }
    });

    if (indexOptions.searchIndex) {
      try {
        this.#ingestReconcile(entry, parsed, removed, indexOptions);
      } catch (err) {
        console.error(`[mount] search index ingest failed for ${entry.collectionPath}`, err);
      }
    }
  }

  #ingestReconcile(entry, parsed, removed, { searchIndex, workspacePathname, fileIndex }) {
    const root = entry.collectionPath;
    const collectionName = searchIndex.collectionNameFor(root) || entry.brunoConfig?.name || path.basename(root);
    const ctx = {
      searchIndex,
      fileIndex: fileIndex ?? null,
      collectionPath: root,
      collectionName,
      workspacePath: workspacePathname
    };
    let changed = false;

    for (const e of removed) {
      if (removeFromSearchIndex({ searchIndex, collectionPath: root, relativePath: e.relativePath })) changed = true;
    }

    for (const [relativePath, source] of parsed) {
      if (ingestParsedFile({ ...ctx, result: source })) changed = true;
    }

    for (const [relativePath, cached] of entry.state) {
      if (parsed.has(relativePath)) continue;
      if (ingestCachedFile(ctx, relativePath, cached)) changed = true;
    }

    searchIndex.addFolders({
      collectionPath: root,
      collectionName,
      workspacePath: workspacePathname,
      folderPaths: withParentFolders([...entry.state.keys()].map((relativePath) => path.dirname(relativePath)).filter((dir) => dir !== '.'))
    });

    if (changed) this.#broadcast('main:search-index-written');
  }

  // The search index rows go through the same tree builder as a mounted collection: each row stands in for a
  // parsed request file, so folders, ordering and uids come out exactly as they do after a mount
  #buildTreeFromIndexRows(collectionPath, rows, { onlyFoldersWithRows = false } = {}) {
    const { getRequestUid } = require('../../cache/requestUids');
    const folders = this.#getSearchIndex().foldersFor(collectionPath).filter(({ folderPath }) => {
      if (!onlyFoldersWithRows) return true;
      return rows.some((row) => row.folderPath === folderPath || row.folderPath?.startsWith(`${folderPath}${path.sep}`));
    });
    const parserResults = new Map(rows.map((row) => [row.requestPath, {
      data: {
        name: row.requestName,
        type: row.requestProtocol,
        // the index reads integers back as BigInt; a missing seq reads as 1, the default the file parsers apply
        seq: Number(row.requestSeq ?? 1),
        request: { method: row.requestType, url: row.requestUrl }
      },
      // a request that could not be parsed carries its error, so it shows the same error mark as in an open collection
      ...(row.requestError ? { error: { message: row.requestError } } : {})
    }]));
    // Folder names and order come from the folder files, as they do in a mounted collection
    for (const { folderPath, name, seq } of folders) {
      parserResults.set(path.join(folderPath, 'folder.bru'), {
        data: { meta: { name: name ?? undefined, seq: seq === null ? undefined : Number(seq) } }
      });
    }
    return buildTree(collectionPath, parserResults, { uidFor: getRequestUid }).items;
  }

  async #emitTree(collectionUid, entry) {
    const { getRequestUid } = require('../../cache/requestUids');
    const tree = buildTree(entry.collectionPath, entry.state, { uidFor: getRequestUid });
    entry.state = new Map();
    await sendTree(collectionUid, entry.collectionPath, tree, entry.emit);
  }

  #getPersistentIndex() {
    if (!this.#index) this.#index = new FileIndex();
    return this.#index;
  }

  // null while the file cache is OFF: nothing is cached, files are parsed again whenever they are needed
  #getIndex() {
    return preferencesUtil.isFileCacheEnabled() ? this.#getPersistentIndex() : null;
  }

  #getSearchIndex() {
    if (!this.#searchIndex) this.#searchIndex = new SearchIndex();
    return this.#searchIndex;
  }

  async #resolveWorkspacePath(collectionPath, workspacePath) {
    if (workspacePath) return path.resolve(workspacePath);
    const { findWorkspacePathForCollection } = require('../../utils/workspace-collections');
    return findWorkspacePathForCollection(collectionPath).catch(() => null);
  }

  #broadcastIndexingStatus() {
    this.#broadcast('main:search-index-status', this.getIndexingStatus());
  }

  #broadcast(channel, payload) {
    const { BrowserWindow } = require('electron');
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(channel, payload);
    }
  }
}

module.exports = { MountManager };
