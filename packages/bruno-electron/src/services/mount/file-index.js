const fs = require('node:fs');
const path = require('node:path');
const { Database } = require('../storage');
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

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS file_index_entries (
        collection_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        id TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection_path, relative_path)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS idx_collection_path ON file_index_entries(collection_path);
    `
  },
  {
    version: 2,
    up: `
      ALTER TABLE file_index_entries ADD COLUMN raw TEXT;
      UPDATE file_index_entries SET mtime = 0, hash = '';
      ALTER TABLE file_index_entries ADD COLUMN created_at INTEGER;
      ALTER TABLE file_index_entries ADD COLUMN updated_at INTEGER;
      UPDATE file_index_entries SET created_at = unixepoch(), updated_at = unixepoch();
    `
  }
];

// TODO: Check for trigger (ON UPDATE) and then see if we can use that to update updated_at

class FileIndex {
  #db;
  #dbPath;

  constructor({ dbPath } = {}) {
    this.#dbPath = dbPath || path.join(require('electron').app.getPath('userData'), 'mount-snapshots.db');
    this.#db = new Database({ path: this.#dbPath, migrations: MIGRATIONS, readBigInts: true });
  }

  close() {
    this.#db.close();
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

  clear() {
    this.#db.exec('DELETE FROM file_index_entries');
    // VACUUM so the file actually shrinks after the DELETE
    this.#db.exec('VACUUM');
  }

  clearCollection(collectionPath) {
    const root = normalize(collectionPath);
    this.#db.run('DELETE FROM file_index_entries WHERE collection_path = ?', root);
  }

  get dbPath() {
    return this.#dbPath;
  }

  entries(collectionPath) {
    const root = normalize(collectionPath);
    const rows = this.#db.all(
      'SELECT relative_path AS relativePath, data, raw FROM file_index_entries WHERE collection_path = ?',
      root
    );
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, { data: JSON.parse(row.data), raw: row.raw });
    }
    return map;
  }

  stage(collectionPath, entry) {
    const root = normalize(collectionPath);
    const { op, relativePath } = entry;

    if (op === 'remove') {
      this.#db.run(
        'DELETE FROM file_index_entries WHERE collection_path = ? AND relative_path = ?',
        root,
        relativePath
      );
      return;
    }

    const { mtime, hash, data, raw } = entry;
    const id = idForAbsolutePath(path.join(root, relativePath));
    this.#db.run(
      `
      INSERT INTO file_index_entries (collection_path, relative_path, id, mtime, hash, data, raw, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(collection_path, relative_path) DO UPDATE SET
        mtime = excluded.mtime,
        hash = excluded.hash,
        data = excluded.data,
        raw = excluded.raw,
        updated_at = unixepoch()
    `,
      root,
      relativePath,
      id,
      mtime,
      hash,
      JSON.stringify(data),
      raw ?? null
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
      raw: fs.readFileSync(absolutePath, 'utf8'),
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
      'SELECT relative_path AS relativePath, id, mtime, hash FROM file_index_entries WHERE collection_path = ?',
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
  FileIndex
};
