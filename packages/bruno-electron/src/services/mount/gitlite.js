const fs = require('node:fs');
const path = require('node:path');
const { Database } = require('@usebruno/storage');
const {
  hashFile,
  normalize,
  toPosix,
  idForAbsolutePath,
  resolveDenylist,
  isDenied,
  walk
} = require('../../utils/mount');

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS snapshot_entries (
        collection_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        id TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection_path, relative_path)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS idx_collection_path ON snapshot_entries(collection_path);
    `
  }
];

class GitLite {
  #db;
  #dbPath;

  constructor({ dbPath } = {}) {
    this.#dbPath = dbPath || path.join(require('electron').app.getPath('userData'), 'mount-snapshots.db');
    this.#db = new Database({ path: this.#dbPath, migrations: MIGRATIONS, readBigInts: true });
  }

  close() {
    this.#db.close();
  }

  status(collectionPath, options = {}) {
    const root = normalize(collectionPath);
    const stored = this.#loadStored(root);
    const denylist = resolveDenylist(options.denylist);
    const added = [];
    const updated = [];
    const removed = [];
    const seen = new Set();

    for (const { relativePath, absolutePath } of walk(root, denylist)) {
      seen.add(relativePath);
      const stat = fs.statSync(absolutePath, { bigint: true });
      const mtime = stat.mtimeNs;
      const prior = stored.get(relativePath);

      if (!prior) {
        const hash = hashFile(absolutePath);
        added.push({ relativePath, absolutePath, mtime, hash });
        continue;
      }

      if (prior.mtime === mtime) continue;

      const hash = hashFile(absolutePath);
      if (hash === prior.hash) continue;

      updated.push({ relativePath, absolutePath, mtime, hash, prevHash: prior.hash });
    }

    for (const [relativePath, row] of stored) {
      if (seen.has(relativePath)) continue;
      if (isDenied(toPosix(relativePath), denylist)) continue;
      removed.push({ relativePath, id: row.id, hash: row.hash });
    }

    return { added, updated, removed };
  }

  clear() {
    this.#db.exec('DELETE FROM snapshot_entries');
    // VACUUM so the file actually shrinks after the DELETE
    this.#db.exec('VACUUM');
  }

  get dbPath() {
    return this.#dbPath;
  }

  entries(collectionPath) {
    const root = normalize(collectionPath);
    const rows = this.#db.all(
      'SELECT relative_path AS relativePath, data FROM snapshot_entries WHERE collection_path = ?',
      root
    );
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, { data: JSON.parse(row.data) });
    }
    return map;
  }

  stage(collectionPath, entry) {
    const root = normalize(collectionPath);
    const { op, relativePath } = entry;

    if (op === 'remove') {
      this.#db.run(
        'DELETE FROM snapshot_entries WHERE collection_path = ? AND relative_path = ?',
        root,
        relativePath
      );
      return;
    }

    const { mtime, hash, data } = entry;
    const id = idForAbsolutePath(path.join(root, relativePath));
    this.#db.run(
      `
      INSERT INTO snapshot_entries (collection_path, relative_path, id, mtime, hash, data)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(collection_path, relative_path) DO UPDATE SET
        mtime = excluded.mtime,
        hash = excluded.hash,
        data = excluded.data
    `,
      root,
      relativePath,
      id,
      mtime,
      hash,
      JSON.stringify(data)
    );
  }

  stageParsed(collectionPath, absolutePath, data) {
    const root = normalize(collectionPath);
    const relativePath = path.relative(root, normalize(absolutePath));
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return;
    const stat = fs.statSync(absolutePath, { bigint: true });
    this.stage(root, {
      op: 'add',
      relativePath,
      mtime: stat.mtimeNs,
      hash: hashFile(absolutePath),
      data
    });
  }

  unstagePath(collectionPath, absolutePath) {
    const root = normalize(collectionPath);
    const relativePath = path.relative(root, normalize(absolutePath));
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return;
    this.stage(root, { op: 'remove', relativePath });
  }

  transaction(callback) {
    return this.#db.transaction(callback);
  }

  #loadStored(collectionPath) {
    const rows = this.#db.all(
      'SELECT relative_path AS relativePath, id, mtime, hash FROM snapshot_entries WHERE collection_path = ?',
      collectionPath
    );
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, row);
    }
    return map;
  }
}

module.exports = {
  GitLite
};
