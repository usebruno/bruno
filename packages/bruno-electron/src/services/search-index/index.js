const path = require('node:path');
const { Database } = require('../storage');
const { normalize, idForAbsolutePath, resolveDenylist, diffFiles } = require('../../utils/mount');

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS search_index_items (
        id TEXT PRIMARY KEY,
        collection_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        name TEXT NOT NULL,
        method TEXT,
        url TEXT,
        request_path TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        collection_uid TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_search_index_collection_path ON search_index_items(collection_path);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_search_index_collection_relpath ON search_index_items(collection_path, relative_path);
    `
  },
  {
    version: 2,
    up: `
      ALTER TABLE search_index_items ADD COLUMN type TEXT NOT NULL DEFAULT 'request';
      ALTER TABLE search_index_items ADD COLUMN seq INTEGER;
      ALTER TABLE search_index_items ADD COLUMN item_path TEXT;
      UPDATE search_index_items SET item_path = relative_path;
    `
  }
];

const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

class SearchIndex {
  #db;
  #dbPath;

  constructor({ dbPath } = {}) {
    this.#dbPath = dbPath || path.join(require('electron').app.getPath('userData'), 'search-index.db');
    this.#db = new Database({ path: this.#dbPath, migrations: MIGRATIONS, readBigInts: true });
  }

  close() {
    this.#db.close();
  }

  get dbPath() {
    return this.#dbPath;
  }

  async status(collectionPath, options = {}) {
    const root = normalize(collectionPath);
    const stored = this.#loadStored(root);
    const denylist = resolveDenylist(options.denylist);
    return diffFiles(root, stored, denylist);
  }

  apply(collectionPath, { upsert = [], removeIds = [] } = {}) {
    const root = normalize(collectionPath);
    this.#db.transaction(() => {
      for (const entry of upsert) this.#upsert(root, entry);
      for (const id of removeIds) this.#db.run('DELETE FROM search_index_items WHERE id = ?', id);
    });
  }

  clearCollection(collectionPath) {
    const root = normalize(collectionPath);
    this.#db.run('DELETE FROM search_index_items WHERE collection_path = ?', root);
  }

  search({ terms, collectionPaths, limit = 50 }) {
    if (!terms.length || !collectionPaths.length) return [];

    const termClauses = terms
      .map(() => `(name LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR folder_path LIKE ? ESCAPE '\\' OR collection_name LIKE ? ESCAPE '\\')`)
      .join(' AND ');
    const collectionPlaceholders = collectionPaths.map(() => '?').join(',');

    const params = [];
    for (const term of terms) {
      const pattern = `%${escapeLike(term)}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    params.push(...collectionPaths, limit);

    return this.#db.all(
      `SELECT id, name, method, url, request_path, folder_path, collection_uid, collection_path, collection_name
       FROM search_index_items
       WHERE type = 'request' AND ${termClauses} AND collection_path IN (${collectionPlaceholders})
       ORDER BY name COLLATE NOCASE
       LIMIT ?`,
      ...params
    );
  }

  // Sourced from the sidebar-tree read path, which needs every folder and request under a
  // collection, not just ones matching a term. `itemPath` is the thing a row *describes* (a
  // folder's own directory, or a request's own file) — distinct from `relativePath`, which is
  // always the real file on disk that `status()` diffs against.
  getFolderTree(collectionPath) {
    const root = normalize(collectionPath);
    const rows = this.#db.all(
      `SELECT item_path AS itemPath, name, type, seq, method, url,
              folder_path AS folderPath, request_path AS absolutePath
       FROM search_index_items
       WHERE collection_path = ?
       ORDER BY item_path`,
      root
    );
    // This connection reads every INTEGER column as a BigInt (mtime needs that precision
    // elsewhere), but a folder's seq is always a small ordering number — sortByNameThenSequence
    // (@usebruno/common) checks it with Number.isFinite/isInteger, which are false for a BigInt,
    // so an unconverted seq is silently treated as absent and the folder falls back to alphabetical order.
    return rows.map((row) => (row.seq == null ? row : { ...row, seq: Number(row.seq) }));
  }

  #upsert(root, entry) {
    const {
      relativePath, absolutePath, itemPath = relativePath, name, method, url,
      collectionUid, collectionName, mtime, hash,
      type = 'request', seq = null
    } = entry;
    const id = idForAbsolutePath(absolutePath);
    const dirname = path.dirname(itemPath);
    const folderPath = dirname === '.' ? '' : dirname;

    this.#db.run(
      `INSERT INTO search_index_items
        (id, collection_path, relative_path, item_path, name, method, url, request_path, folder_path, collection_uid, collection_name, mtime, hash, type, seq, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         method = excluded.method,
         url = excluded.url,
         folder_path = excluded.folder_path,
         mtime = excluded.mtime,
         hash = excluded.hash,
         type = excluded.type,
         seq = excluded.seq,
         updated_at = excluded.updated_at`,
      id, root, relativePath, itemPath, name, method || null, url || null,
      absolutePath, folderPath, collectionUid, collectionName, mtime, hash, type, seq
    );
  }

  #loadStored(collectionPath) {
    const rows = this.#db.all(
      'SELECT relative_path AS relativePath, id, mtime, hash FROM search_index_items WHERE collection_path = ?',
      collectionPath
    );
    const map = new Map();
    for (const row of rows) map.set(row.relativePath, row);
    return map;
  }
}

module.exports = { SearchIndex };
