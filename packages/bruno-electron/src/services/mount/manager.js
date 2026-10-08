const fs = require('node:fs');
const path = require('node:path');
const { JobType, getPool, destroyPool } = require('../pool');
const { FileIndex } = require('./file-index');
const { buildTree } = require('./tree-builder');
const { defaultClassify, uidForSeed } = require('../../utils/mount');
const { getWsClient } = require('../../ipc/network/ws-event-handlers');
const { SearchIndex } = require('../search-index');
const { indexCollection, toRow, toMetaRow, withParentFolders } = require('../search-index/indexer');
const { preferencesUtil } = require('../../store/preferences');

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
  #activeIndexingCount = 0;

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
    // both indexes run on the shared database, which the sqlite service closes
    this.#index = null;
    this.#searchIndex = null;
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

  async searchIndexTrees(term, workspacePath) {
    const matches = this.searchIndex(term, { scope: 'request', workspacePath });
    const byCollection = new Map();
    for (const row of matches) {
      if (!byCollection.has(row.collectionPath)) byCollection.set(row.collectionPath, []);
      byCollection.get(row.collectionPath).push(row);
    }

    const trees = {};
    for (const [collectionPath, rows] of byCollection) {
      trees[collectionPath] = this.#buildTreeFromIndexRows(collectionPath, rows, { onlyFoldersWithRows: true });
    }
    return trees;
  }

  async getIndexTree({ collectionPath, collectionName }) {
    const root = path.resolve(collectionPath);
    await this.indexCollectionInBackground({ collectionPath: root, collectionName }).catch(() => {});
    const rows = this.#getSearchIndex().rowsForCollection(root);
    return { items: this.#buildTreeFromIndexRows(root, rows) };
  }

  async indexCollectionInBackground({ collectionPath, collectionName, workspacePath }) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const root = path.resolve(collectionPath);
    const alreadyMounted = Array.from(this.#mounts.values()).some((entry) => entry.collectionPath === root);
    if (alreadyMounted) return;
    const resolvedWorkspacePath = await this.#resolveWorkspacePath(root, workspacePath);
    await this.#withIndexingSession((onWork) => indexCollection(this.#getSearchIndex(), {
      collectionPath: root,
      collectionName,
      workspacePath: resolvedWorkspacePath,
      fileIndex: this.#getIndex(),
      onWork
    }));
  }

  async indexManyCollectionsInBackground(collections, workspacePath) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    await this.#withIndexingSession(async (onWork) => {
      const priorPaths = new Set(this.#getSearchIndex().collectionPaths());
      const resolved = collections.map(({ path: collectionPath, name: collectionName }) => ({
        root: path.resolve(collectionPath),
        collectionName
      }));
      // collections the search index already knows are quick (most files are skipped), so they go first
      const isFast = (c) => priorPaths.has(c.root);
      const ordered = [
        ...resolved.filter(isFast),
        ...resolved.filter((c) => !isFast(c))
      ];

      for (const { root, collectionName } of ordered) {
        await indexCollection(this.#getSearchIndex(), {
          collectionPath: root,
          collectionName,
          workspacePath,
          fileIndex: this.#getIndex(),
          onWork
        }).catch(() => {});
      }
    });
  }

  getIndexingStatus() {
    return {
      isIndexing: this.#activeIndexingCount > 0
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
        this.#syncSearchIndex(entry, parsed, indexOptions);
      } catch (err) {
        console.error(`[mount] search index sync failed for ${entry.collectionPath}`, err);
      }
    }
  }

  // Brings the collection's search rows in line with what was just reconciled, reusing the
  // parse results and cached entries so nothing is parsed a second time for search.
  #syncSearchIndex(entry, parsed, { searchIndex, workspacePathname }) {
    const root = entry.collectionPath;
    const collectionName = searchIndex.collectionNameFor(root) || entry.brunoConfig?.name || path.basename(root);
    const stored = searchIndex.entriesFor(root);
    const storedMeta = searchIndex.metaEntriesFor(root);

    searchIndex.transaction(() => {
      for (const [relativePath, cached] of entry.state) {
        const isRequest = defaultClassify(relativePath)?.type === 'request';
        const source = parsed.get(relativePath) ?? cached;
        if (source.mtime === undefined) continue;
        // a request that failed to parse still gets a row with the error; a naming file that failed has nothing to give
        if (source.error && !isRequest) continue;

        const prior = (isRequest ? stored : storedMeta).get(relativePath);
        if (prior && prior.mtime === source.mtime && prior.hash === source.hash) continue;

        const file = { relativePath, mtime: source.mtime, hash: source.hash, data: source.data, error: source.error };
        if (isRequest) {
          searchIndex.upsert(toRow(root, collectionName, file, workspacePathname));
        } else {
          // collection and folder files carry the names and order the index keeps for them
          const metaRow = toMetaRow(root, file);
          if (metaRow) searchIndex.upsertMeta(metaRow);
        }
      }
      for (const relativePath of stored.keys()) {
        if (!entry.state.has(relativePath)) searchIndex.remove(root, relativePath);
      }
      for (const relativePath of storedMeta.keys()) {
        if (!entry.state.has(relativePath)) searchIndex.removeMeta(root, relativePath);
      }

      // Folders of the files that were read. Empty folders are not visible here; the watcher and the index run add them.
      searchIndex.addFolders({
        collectionPath: root,
        collectionName,
        workspacePath: workspacePathname,
        folderPaths: withParentFolders([...entry.state.keys()].map((relativePath) => path.dirname(relativePath)).filter((dir) => dir !== '.'))
      });
    });
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

  // The "indexing" state starts when a run finds something to read or write, not when it starts looking. Every search
  // session checks all collections for outside changes; when nothing changed there is no indexing to show.
  async #withIndexingSession(run) {
    let working = false;
    const onWork = () => {
      if (working) return;
      working = true;
      this.#beginIndexingSession();
    };
    try {
      return await run(onWork);
    } finally {
      if (working) this.#endIndexingSession();
    }
  }

  #beginIndexingSession() {
    this.#activeIndexingCount++;
    if (this.#activeIndexingCount === 1) this.#broadcastIndexingStatus();
  }

  #endIndexingSession() {
    this.#activeIndexingCount--;
    if (this.#activeIndexingCount === 0) this.#broadcastIndexingStatus();
  }

  #broadcastIndexingStatus() {
    const { BrowserWindow } = require('electron');
    const status = this.getIndexingStatus();
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('main:search-index-status', status);
    }
  }
}

module.exports = { MountManager };
