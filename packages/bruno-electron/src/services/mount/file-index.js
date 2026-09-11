const fs = require('node:fs');
const path = require('node:path');
const { getStatements, getDatabase } = require('../../ipc/sqlite');
const {
  hashFile,
  hashFileAsync,
  normalize,
  posixifyPath,
  idForAbsolutePath,
  resolveDenylist,
  isDenied,
  walk
} = require('../../utils/mount');

// TODO: Check for trigger (ON UPDATE) and then see if we can use that to update updated_at

class FileIndex {
  #statements;
  #db;
  #applicationVersion;

  constructor() {
    this.#statements = getStatements();
    this.#db = getDatabase();
    if (!this.#statements || !this.#db) {
      throw new Error('the file cache is unavailable: the sqlite database is not open');
    }
    this.#applicationVersion = require('electron').app.getVersion();
  }

  async status(collectionPath, options = {}) {
    const root = normalize(collectionPath);
    const stored = this.#loadStored(root);
    const denylist = resolveDenylist(options.denylist);
    const added = [];
    const updated = [];
    const removed = [];
    const seen = new Set();

    const files = walk(root, denylist);
    const results = await Promise.all(files.map(async ({ relativePath, absolutePath }) => {
      const stat = await fs.promises.stat(absolutePath, { bigint: true });
      const mtime = stat.mtimeNs;
      const prior = stored.get(relativePath);

      if (!prior) {
        const hash = await hashFileAsync(absolutePath);
        return { kind: 'added', entry: { relativePath, absolutePath, mtime, hash } };
      }
      if (prior.applicationVersion !== this.#applicationVersion) {
        const hash = await hashFileAsync(absolutePath);
        return { kind: 'updated', entry: { relativePath, absolutePath, mtime, hash, prevHash: prior.hash } };
      }
      if (prior.mtime === mtime) return { kind: 'unchanged', relativePath };
      const hash = await hashFileAsync(absolutePath);
      if (hash === prior.hash) return { kind: 'unchanged', relativePath };
      return { kind: 'updated', entry: { relativePath, absolutePath, mtime, hash, prevHash: prior.hash } };
    }));

    for (const r of results) {
      if (r.kind === 'added') {
        added.push(r.entry);
        seen.add(r.entry.relativePath);
      } else if (r.kind === 'updated') {
        updated.push(r.entry);
        seen.add(r.entry.relativePath);
      } else {
        seen.add(r.relativePath);
      }
    }

    for (const [relativePath, row] of stored) {
      if (seen.has(relativePath)) continue;
      if (isDenied(posixifyPath(relativePath), denylist)) continue;
      removed.push({ relativePath, id: row.id, hash: row.hash });
    }

    return { added, updated, removed };
  }

  clearCollection(collectionPath) {
    this.#statements.execute('file_index_clear_collection', { collection_path: normalize(collectionPath) });
  }

  entries(collectionPath) {
    const rows = this.#statements.execute('file_index_entries_for_collection', {
      collection_path: normalize(collectionPath)
    });
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, { data: JSON.parse(row.data), raw: row.raw });
    }
    return map;
  }

  stage(collectionPath, entry) {
    const root = normalize(collectionPath);
    const { op } = entry;
    const relativePath = path.normalize(entry.relativePath);

    if (op === 'remove') {
      this.#statements.execute('file_index_delete_entry', { collection_path: root, relative_path: relativePath });
      return;
    }

    const { mtime, hash, data, raw } = entry;
    this.#statements.execute('file_index_upsert', {
      collection_path: root,
      relative_path: relativePath,
      id: idForAbsolutePath(path.join(root, relativePath)),
      mtime,
      hash,
      data: JSON.stringify(data),
      raw: raw ?? null,
      application_version: this.#applicationVersion
    });
  }

  stageParsed(collectionPath, absolutePath, data) {
    const target = this.#resolveTarget(collectionPath, absolutePath);
    if (!target) return;
    const stat = fs.statSync(absolutePath, { bigint: true });
    this.stage(target.root, {
      op: 'add',
      relativePath: target.relativePath,
      mtime: stat.mtimeNs,
      hash: hashFile(absolutePath),
      raw: fs.readFileSync(absolutePath, 'utf8'),
      data
    });
  }

  unstagePath(collectionPath, absolutePath) {
    const target = this.#resolveTarget(collectionPath, absolutePath);
    if (!target) return;
    this.stage(target.root, { op: 'remove', relativePath: target.relativePath });
  }

  #resolveTarget(collectionPath, absolutePath) {
    const root = normalize(collectionPath);
    const relativePath = path.normalize(path.relative(root, normalize(absolutePath)));
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
    return { root, relativePath };
  }

  transaction(callback) {
    return this.#db._transaction(callback);
  }

  #loadStored(collectionPath) {
    const rows = this.#statements.execute('file_index_stored', { collection_path: collectionPath });
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, row);
    }
    return map;
  }
}

module.exports = {
  FileIndex
};
