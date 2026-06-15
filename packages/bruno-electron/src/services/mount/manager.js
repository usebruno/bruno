const fs = require('node:fs');
const path = require('node:path');
const { JobType, getPool, destroyPool } = require('../pool');
const { FileIndex } = require('./file-index');
const { buildTree } = require('./tree-builder');
const { defaultClassify, uidForSeed } = require('../../utils/mount');

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
      const key = variable.name || `index:${i}`;
      variable.uid = uidForSeed(`${env.uid}#var#${key}`);
    });
    if (!envHasSecrets(env)) continue;
    try {
      const envSecrets = getEnvSecretsStore().getEnvSecrets(collectionPath, env);
      for (const secret of envSecrets || []) {
        const variable = env.variables.find((v) => v.name === secret.name);
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
  #mounts = new Map();

  async mount({ win, collectionPath, collectionUid, brunoConfig, emit }) {
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
    try {
      entry.state = this.#getIndex().entries(collectionPath);
      await this.#reconcile(entry);
      await this.#emitTree(collectionUid, entry);

      // skip the startup walk (already done) and stage live edits into the cache
      const collectionWatcher = require('../../app/collection-watcher');
      collectionWatcher.addWatcher(entry.win, collectionPath, collectionUid, brunoConfig, false, false, {
        ignoreInitial: true,
        fileIndex: this.#getIndex()
      });
      collectionWatcher.addTempDirectoryWatcher(entry.win, tempDirectoryPath, collectionUid, collectionPath);
    } finally {
      entry.emit.loading(false);
    }
    return tempDirectoryPath;
  }

  async unmount(collectionUid) {
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
  }

  getCacheSize() {
    try {
      return fs.statSync(this.#getIndex().dbPath).size;
    } catch (err) {
      if (err && err.code === 'ENOENT') return 0;
      throw err;
    }
  }

  clearCache() {
    this.#getIndex().clear();
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
          entry.state.set(e.relativePath, { error: result.error });
          continue;
        }
        entry.state.set(e.relativePath, { data: result.data });
        this.#getIndex().stage(entry.collectionPath, {
          op: 'add',
          relativePath: e.relativePath,
          mtime: result.mtime,
          hash: result.hash,
          data: result.data
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
}

module.exports = { MountManager };
