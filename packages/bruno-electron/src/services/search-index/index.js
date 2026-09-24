const path = require('node:path');
const { Database } = require('../storage');

const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS search_index_entries (
        collection_path TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        folder_path TEXT,
        folder_name TEXT,
        request_path TEXT NOT NULL,
        request_name TEXT NOT NULL,
        request_type TEXT,
        request_url TEXT,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        PRIMARY KEY (collection_path, request_path)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS idx_search_index_collection_path ON search_index_entries(collection_path);
    `
  },
  {
    version: 2,
    up: `
      ALTER TABLE search_index_entries ADD COLUMN request_protocol TEXT;
    `
  },
  {
    version: 3,
    up: `
      ALTER TABLE search_index_entries ADD COLUMN workspace_path TEXT;
    `
  }
];

const SELECT_ROW = `
  collection_path AS collectionPath, collection_name AS collectionName,
  folder_path AS folderPath, folder_name AS folderName,
  request_path AS requestPath, request_name AS requestName,
  request_type AS requestType, request_url AS requestUrl,
  request_protocol AS requestProtocol, workspace_path AS workspacePath
`;

class SearchIndex {
  #db;
  #dbPath;

  constructor({ dbPath } = {}) {
    this.#dbPath = dbPath || path.join(require('electron').app.getPath('userData'), 'sidebar-search-index.db');
    this.#db = new Database({
      path: this.#dbPath,
      migrations: MIGRATIONS,
      pragmas: { journal_mode: 'WAL' },
      readBigInts: true
    });
  }

  get dbPath() {
    return this.#dbPath;
  }

  close() {
    this.#db.close();
  }

  upsert(entry) {
    const {
      collectionPath,
      collectionName,
      folderPath,
      folderName,
      requestPath,
      requestName,
      requestType,
      requestUrl,
      requestProtocol,
      workspacePath,
      mtime,
      hash
    } = entry;

    this.#db.run(
      `
      INSERT INTO search_index_entries (
        collection_path, collection_name, folder_path, folder_name,
        request_path, request_name, request_type, request_url, request_protocol, workspace_path, mtime, hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(collection_path, request_path) DO UPDATE SET
        collection_name = excluded.collection_name,
        folder_path = excluded.folder_path,
        folder_name = excluded.folder_name,
        request_name = excluded.request_name,
        request_type = excluded.request_type,
        request_url = excluded.request_url,
        request_protocol = excluded.request_protocol,
        workspace_path = excluded.workspace_path,
        mtime = excluded.mtime,
        hash = excluded.hash
    `,
      collectionPath,
      collectionName,
      folderPath ?? null,
      folderName ?? null,
      requestPath,
      requestName,
      requestType ?? null,
      requestUrl ?? null,
      requestProtocol ?? null,
      workspacePath ?? null,
      mtime,
      hash
    );
  }

  remove(collectionPath, requestPath) {
    this.#db.run(
      'DELETE FROM search_index_entries WHERE collection_path = ? AND request_path = ?',
      collectionPath,
      requestPath
    );
  }

  entry(collectionPath, requestPath) {
    return this.#db.get(
      `SELECT ${SELECT_ROW}, mtime, hash FROM search_index_entries WHERE collection_path = ? AND request_path = ?`,
      collectionPath,
      requestPath
    );
  }

  entriesFor(collectionPath) {
    const rows = this.#db.all(
      'SELECT request_path AS requestPath, mtime, hash FROM search_index_entries WHERE collection_path = ?',
      collectionPath
    );
    return new Map(rows.map((row) => [row.requestPath, row]));
  }

  collectionPaths() {
    return this.#db
      .all('SELECT DISTINCT collection_path AS collectionPath FROM search_index_entries')
      .map((row) => row.collectionPath);
  }

  rowsForCollection(collectionPath) {
    return this.#db.all(
      `SELECT ${SELECT_ROW} FROM search_index_entries WHERE collection_path = ?`,
      collectionPath
    );
  }

  search(term, { scope = 'request', workspacePath } = {}) {
    const like = `%${term}%`;
    const workspaceClause = workspacePath ? 'AND workspace_path = ?' : '';
    const workspaceParams = workspacePath ? [workspacePath] : [];

    if (scope === 'collection') {
      return this.#db.all(
        `SELECT DISTINCT collection_path AS collectionPath, collection_name AS collectionName
         FROM search_index_entries WHERE (collection_name LIKE ? OR collection_path LIKE ?) ${workspaceClause}`,
        like, like, ...workspaceParams
      );
    }

    if (scope === 'folder') {
      return this.#db.all(
        `SELECT DISTINCT collection_path AS collectionPath, collection_name AS collectionName,
                folder_path AS folderPath, folder_name AS folderName
         FROM search_index_entries
         WHERE folder_name IS NOT NULL AND (folder_name LIKE ? OR folder_path LIKE ?) ${workspaceClause}`,
        like, like, ...workspaceParams
      );
    }

    return this.#db.all(
      `SELECT ${SELECT_ROW} FROM search_index_entries
       WHERE (request_name LIKE ? OR request_path LIKE ? OR request_type LIKE ? OR request_url LIKE ?) ${workspaceClause}`,
      like, like, like, like, ...workspaceParams
    );
  }

  clear() {
    this.#db.exec('DELETE FROM search_index_entries');
    this.#db.exec('VACUUM');
    this.#db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  clearCollection(collectionPath) {
    this.#db.run('DELETE FROM search_index_entries WHERE collection_path = ?', collectionPath);
  }

  transaction(callback) {
    return this.#db.transaction(callback);
  }
}

module.exports = { SearchIndex };
