const fs = require('node:fs');
const path = require('node:path');
const { JobType, getPool, destroyPool } = require('../pool');
const { FileIndex } = require('./file-index');
const { buildTree } = require('./tree-builder');
const { defaultClassify, uidForSeed } = require('../../utils/mount');
const { getWsClient } = require('../../ipc/network/ws-event-handlers');
const { SearchIndex } = require('../search-index');
const { indexCollection } = require('../search-index/indexer');
const { buildFolderTree } = require('../search-index/build-tree');
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
      existing.state = this.#getIndex().entries(existing.collectionPath);
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
    const searchIndexEnabled = preferencesUtil.isSearchIndexEnabled();
    if (searchIndexEnabled) this.#beginIndexingSession();
    let indexingHandedOff = false;
    try {
      entry.state = this.#getIndex().entries(collectionPath);
      await this.#reconcile(entry);
      await this.#emitTree(collectionUid, entry);

      const resolvedWorkspacePath = searchIndexEnabled
        ? await this.#resolveWorkspacePath(collectionPath, workspacePath)
        : null;

      if (searchIndexEnabled) {
        indexingHandedOff = true;
        indexCollection(this.#getSearchIndex(), {
          collectionPath,
          collectionName: path.basename(collectionPath),
          workspacePath: resolvedWorkspacePath,
          fileIndex: this.#getIndex()
        })
          .catch((err) => console.error(`[mount:${collectionUid}] search index refresh failed:`, err))
          .finally(() => this.#endIndexingSession());
      }

      // skip the startup walk (already done) and stage live edits into the cache
      const collectionWatcher = require('../../app/collection-watcher');
      collectionWatcher.addWatcher(entry.win, collectionPath, collectionUid, brunoConfig, false, false, {
        ignoreInitial: true,
        fileIndex: this.#getIndex(),
        searchIndex: searchIndexEnabled ? this.#getSearchIndex() : null,
        workspacePathname: resolvedWorkspacePath
      });
      collectionWatcher.addTempDirectoryWatcher(entry.win, tempDirectoryPath, collectionUid, collectionPath);
    } catch (err) {
      if (searchIndexEnabled && !indexingHandedOff) this.#endIndexingSession();
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

  async shutdown() {
    await Promise.all(
      Array.from(this.#mounts.keys()).map((uid) => this.unmount(uid).catch(() => {}))
    );
    await destroyPool().catch(() => {});
    if (this.#index) {
      this.#index.close();
      this.#index = null;
    }
    if (this.#searchIndex) {
      this.#searchIndex.close();
      this.#searchIndex = null;
    }
  }

  getCacheSize() {
    try {
      return fs.statSync(this.#getIndex().dbPath).size;
    } catch (err) {
      if (err && err.code === 'ENOENT') return 0;
      throw err;
    }
  }

  getSearchIndexSize() {
    try {
      return fs.statSync(this.#getSearchIndex().dbPath).size;
    } catch (err) {
      if (err && err.code === 'ENOENT') return 0;
      throw err;
    }
  }

  clearCache() {
    this.#getIndex().clear();
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
      trees[collectionPath] = buildFolderTree(collectionPath, rows);
    }
    return trees;
  }

  async getIndexTree({ collectionPath, collectionName }) {
    const root = path.resolve(collectionPath);
    await this.indexCollectionInBackground({ collectionPath: root, collectionName }).catch(() => {});
    const rows = this.#getSearchIndex().rowsForCollection(root);
    return { items: buildFolderTree(root, rows) };
  }

  sweepRemovedCollections(validPaths) {
    const valid = new Set(validPaths.map((p) => path.resolve(p)));
    const known = new Set([...this.#getIndex().collectionPaths(), ...this.#getSearchIndex().collectionPaths()]);
    for (const collectionPath of known) {
      if (valid.has(collectionPath)) continue;
      this.#getIndex().clearCollection(collectionPath);
      this.#getSearchIndex().clearCollection(collectionPath);
    }
  }

  async indexCollectionInBackground({ collectionPath, collectionName, workspacePath }) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const root = path.resolve(collectionPath);
    const alreadyMounted = Array.from(this.#mounts.values()).some((entry) => entry.collectionPath === root);
    if (alreadyMounted) return;
    const resolvedWorkspacePath = await this.#resolveWorkspacePath(root, workspacePath);
    await this.#runIndexCollection(this.#getSearchIndex(), {
      collectionPath: root,
      collectionName,
      workspacePath: resolvedWorkspacePath,
      fileIndex: preferencesUtil.isFileCacheEnabled() ? this.#getIndex() : null
    });
  }

  async indexManyCollectionsInBackground(collections, workspacePath) {
    if (!preferencesUtil.isSearchIndexEnabled()) return;
    const fileCacheEnabled = preferencesUtil.isFileCacheEnabled();
    this.#beginIndexingSession();
    try {
      const priorPaths = new Set(this.#getSearchIndex().collectionPaths());
      const fileCachePaths = fileCacheEnabled ? new Set(this.#getIndex().collectionPaths()) : new Set();
      const resolved = collections.map(({ path: collectionPath, name: collectionName }) => ({
        root: path.resolve(collectionPath),
        collectionName
      }));
      const isFast = (c) => priorPaths.has(c.root) || fileCachePaths.has(c.root);
      const ordered = [
        ...resolved.filter(isFast),
        ...resolved.filter((c) => !isFast(c))
      ];

      for (const { root, collectionName } of ordered) {
        await indexCollection(this.#getSearchIndex(), {
          collectionPath: root,
          collectionName,
          workspacePath,
          fileIndex: fileCacheEnabled ? this.#getIndex() : null
        }).catch(() => {});
      }
    } finally {
      this.#endIndexingSession();
    }
  }

  getIndexingStatus() {
    return {
      isIndexing: this.#activeIndexingCount > 0
    };
  }

  clearCollectionIndex(collectionPath) {
    const root = path.resolve(collectionPath);
    this.#getIndex().clearCollection(root);
    this.#getSearchIndex().clearCollection(root);
  }

  async #reconcile(entry) {
    const denylist = entry.brunoConfig?.ignore || [];
    const { added, updated, removed } = await this.#getIndex().status(entry.collectionPath, { denylist });

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
            const result = await pool.run(JobType.ParseFile, {
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

    this.#getIndex().transaction(() => {
      for (const e of toParse) {
        const result = parsed.get(e.relativePath);
        if (!result) continue;
        if (result.error) {
          entry.state.set(e.relativePath, { data: result.data, error: result.error, raw: result.raw });
          continue;
        }
        entry.state.set(e.relativePath, { data: result.data, raw: result.raw });
        this.#getIndex().stage(entry.collectionPath, {
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
        this.#getIndex().stage(entry.collectionPath, { op: 'remove', relativePath: e.relativePath });
      }
    });
  }

  async #emitTree(collectionUid, entry) {
    const { getRequestUid } = require('../../cache/requestUids');
    const tree = buildTree(entry.collectionPath, entry.state, { uidFor: getRequestUid });
    await sendTree(collectionUid, entry.collectionPath, tree, entry.emit);
  }

  #getIndex() {
    if (!this.#index) this.#index = new FileIndex({});
    return this.#index;
  }

  #getSearchIndex() {
    if (!this.#searchIndex) this.#searchIndex = new SearchIndex({});
    return this.#searchIndex;
  }

  async #resolveWorkspacePath(collectionPath, workspacePath) {
    if (workspacePath) return path.resolve(workspacePath);
    const { findWorkspacePathForCollection } = require('../../utils/workspace-collections');
    return findWorkspacePathForCollection(collectionPath).catch(() => null);
  }

  async #runIndexCollection(...args) {
    this.#beginIndexingSession();
    try {
      await indexCollection(...args);
    } finally {
      this.#endIndexingSession();
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
