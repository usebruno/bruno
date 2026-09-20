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
       WHERE ${termClauses} AND collection_path IN (${collectionPlaceholders})
       ORDER BY name COLLATE NOCASE
       LIMIT ?`,
      ...params
    );
  }

  #upsert(root, entry) {
    const { relativePath, absolutePath, name, method, url, collectionUid, collectionName, mtime, hash } = entry;
    const id = idForAbsolutePath(absolutePath);
    const dirname = path.dirname(relativePath);
    const folderPath = dirname === '.' ? '' : dirname;

    this.#db.run(
      `INSERT INTO search_index_items
        (id, collection_path, relative_path, name, method, url, request_path, folder_path, collection_uid, collection_name, mtime, hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         method = excluded.method,
         url = excluded.url,
         folder_path = excluded.folder_path,
         mtime = excluded.mtime,
         hash = excluded.hash,
         updated_at = excluded.updated_at`,
      id, root, relativePath, name, method || null, url || null,
      absolutePath, folderPath, collectionUid, collectionName, mtime, hash
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
