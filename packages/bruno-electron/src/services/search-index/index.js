const path = require('node:path');
const { Database } = require('../storage');

const MIGRATIONS = [
  {
    version: 1,
    up: `
      -- One row per request file. A request that could not be parsed keeps a row too, with the error message in
      -- request_error, so it can still be found by what could be read from it and is not read again until it changes.
      CREATE TABLE IF NOT EXISTS search_index_entries (
        collection_path TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        folder_path TEXT,
        folder_name TEXT,
        request_path TEXT NOT NULL,
        request_name TEXT NOT NULL,
        request_type TEXT,
        request_url TEXT,
        request_protocol TEXT,
        request_seq INTEGER,
        request_error TEXT,
        workspace_path TEXT,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        PRIMARY KEY (collection_path, request_path)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS idx_search_index_collection_path ON search_index_entries(collection_path);

      -- The files that name things: bruno.json / opencollection.yml (the collection) and folder.bru / folder.yml
      -- (a folder). One row per file, with the name and seq read from it.
      CREATE TABLE IF NOT EXISTS search_index_meta (
        collection_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        kind TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        name TEXT,
        seq INTEGER,
        mtime INTEGER NOT NULL,
        hash TEXT NOT NULL,
        PRIMARY KEY (collection_path, relative_path)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS idx_search_index_meta_lookup ON search_index_meta(collection_path, kind, folder_path);

      -- Every folder of a collection, with or without requests in it: an empty folder is still a folder you can
      -- search for.
      CREATE TABLE IF NOT EXISTS search_index_folders (
        collection_path TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        workspace_path TEXT,
        PRIMARY KEY (collection_path, folder_path)
      ) WITHOUT ROWID;

      -- The request rows with the collection name and folder name read from the naming files, so a renamed folder or
      -- collection shows its new name without rewriting the request rows.
      CREATE VIEW IF NOT EXISTS search_index_view AS
      SELECT
        e.collection_path AS collection_path,
        COALESCE(
          (SELECT m.name FROM search_index_meta m
            WHERE m.collection_path = e.collection_path AND m.kind IN ('collection', 'config') AND m.name IS NOT NULL
            ORDER BY CASE m.kind WHEN 'collection' THEN 0 ELSE 1 END LIMIT 1),
          e.collection_name
        ) AS collection_name,
        e.folder_path AS folder_path,
        COALESCE(
          (SELECT m.name FROM search_index_meta m
            WHERE m.collection_path = e.collection_path AND m.kind = 'folder' AND m.folder_path = e.folder_path
              AND m.name IS NOT NULL),
          e.folder_name
        ) AS folder_name,
        e.request_path AS request_path,
        e.request_name AS request_name,
        e.request_type AS request_type,
        e.request_url AS request_url,
        e.request_protocol AS request_protocol,
        e.request_seq AS request_seq,
        e.request_error AS request_error,
        e.workspace_path AS workspace_path
      FROM search_index_entries e;

      -- The folders with their collection name and folder name read from the naming files.
      CREATE VIEW IF NOT EXISTS search_index_folder_view AS
      SELECT
        f.collection_path AS collection_path,
        COALESCE(
          (SELECT m.name FROM search_index_meta m
            WHERE m.collection_path = f.collection_path AND m.kind IN ('collection', 'config') AND m.name IS NOT NULL
            ORDER BY CASE m.kind WHEN 'collection' THEN 0 ELSE 1 END LIMIT 1),
          f.collection_name
        ) AS collection_name,
        f.folder_path AS folder_path,
        COALESCE(
          (SELECT m.name FROM search_index_meta m
            WHERE m.collection_path = f.collection_path AND m.kind = 'folder' AND m.folder_path = f.folder_path
              AND m.name IS NOT NULL),
          f.folder_name
        ) AS folder_name,
        f.workspace_path AS workspace_path
      FROM search_index_folders f;
    `
  }
];

const SELECT_ROW = `
  collection_path AS collectionPath, collection_name AS collectionName,
  folder_path AS folderPath, folder_name AS folderName,
  request_path AS requestPath, request_name AS requestName,
  request_type AS requestType, request_url AS requestUrl,
  request_protocol AS requestProtocol, request_seq AS requestSeq, request_error AS requestError,
  workspace_path AS workspacePath
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
      requestSeq,
      requestError,
      workspacePath,
      mtime,
      hash
    } = entry;

    this.#db.run(
      `
      INSERT INTO search_index_entries (
        collection_path, collection_name, folder_path, folder_name,
        request_path, request_name, request_type, request_url, request_protocol, request_seq, request_error,
        workspace_path, mtime, hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(collection_path, request_path) DO UPDATE SET
        collection_name = excluded.collection_name,
        folder_path = excluded.folder_path,
        folder_name = excluded.folder_name,
        request_name = excluded.request_name,
        request_type = excluded.request_type,
        request_url = excluded.request_url,
        request_protocol = excluded.request_protocol,
        request_seq = excluded.request_seq,
        request_error = excluded.request_error,
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
      requestSeq ?? null,
      requestError ?? null,
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

  collectionNameFor(collectionPath) {
    const row = this.#db.get(
      'SELECT collection_name AS collectionName FROM search_index_view WHERE collection_path = ? LIMIT 1',
      collectionPath
    );
    return row?.collectionName ?? null;
  }

  metaEntriesFor(collectionPath) {
    const rows = this.#db.all(
      'SELECT relative_path AS relativePath, mtime, hash FROM search_index_meta WHERE collection_path = ?',
      collectionPath
    );
    return new Map(rows.map((row) => [row.relativePath, row]));
  }

  upsertMeta({ collectionPath, relativePath, kind, folderPath, name, seq, mtime, hash }) {
    this.#db.run(
      `
      INSERT INTO search_index_meta (collection_path, relative_path, kind, folder_path, name, seq, mtime, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(collection_path, relative_path) DO UPDATE SET
        kind = excluded.kind,
        folder_path = excluded.folder_path,
        name = excluded.name,
        seq = excluded.seq,
        mtime = excluded.mtime,
        hash = excluded.hash
    `,
      collectionPath,
      relativePath,
      kind,
      folderPath,
      name ?? null,
      seq ?? null,
      mtime,
      hash
    );
  }

  removeMeta(collectionPath, relativePath) {
    this.#db.run(
      'DELETE FROM search_index_meta WHERE collection_path = ? AND relative_path = ?',
      collectionPath,
      relativePath
    );
  }

  foldersFor(collectionPath) {
    return this.#db.all(
      `SELECT f.folder_path AS folderPath, COALESCE(m.name, f.folder_name) AS name, m.seq AS seq
       FROM search_index_folders f
       LEFT JOIN search_index_meta m
         ON m.collection_path = f.collection_path AND m.kind = 'folder' AND m.folder_path = f.folder_path
       WHERE f.collection_path = ?`,
      collectionPath
    );
  }

  // Adds the folders (and keeps their names/workspace current); never removes any
  addFolders({ collectionPath, collectionName, workspacePath, folderPaths }) {
    for (const folderPath of folderPaths) {
      this.#db.run(
        `
        INSERT INTO search_index_folders (collection_path, collection_name, folder_path, folder_name, workspace_path)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(collection_path, folder_path) DO UPDATE SET
          collection_name = excluded.collection_name,
          folder_name = excluded.folder_name,
          workspace_path = excluded.workspace_path
      `,
        collectionPath,
        collectionName,
        folderPath,
        path.basename(folderPath),
        workspacePath ?? null
      );
    }
  }

  // Makes the stored folders exactly the given ones
  syncFolders({ collectionPath, collectionName, workspacePath, folderPaths }) {
    const wanted = new Set(folderPaths);
    this.#db.transaction(() => {
      this.addFolders({ collectionPath, collectionName, workspacePath, folderPaths });
      const stored = this.#db.all('SELECT folder_path AS folderPath FROM search_index_folders WHERE collection_path = ?', collectionPath);
      for (const { folderPath } of stored) {
        if (!wanted.has(folderPath)) {
          this.#db.run('DELETE FROM search_index_folders WHERE collection_path = ? AND folder_path = ?', collectionPath, folderPath);
        }
      }
    });
  }

  // Removes a folder and everything under it
  removeFolderTree(collectionPath, folderPath) {
    this.#db.run(
      'DELETE FROM search_index_folders WHERE collection_path = ? AND (folder_path = ? OR substr(folder_path, 1, ?) = ?)',
      collectionPath,
      folderPath,
      folderPath.length + 1,
      `${folderPath}${path.sep}`
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
      `SELECT ${SELECT_ROW} FROM search_index_view WHERE collection_path = ?`,
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
         FROM search_index_view WHERE (collection_name LIKE ? OR collection_path LIKE ?) ${workspaceClause}`,
        like, like, ...workspaceParams
      );
    }

    if (scope === 'folder') {
      return this.#db.all(
        `SELECT collection_path AS collectionPath, collection_name AS collectionName,
                folder_path AS folderPath, folder_name AS folderName
         FROM search_index_folder_view
         WHERE (folder_name LIKE ? OR folder_path LIKE ?) ${workspaceClause}`,
        like, like, ...workspaceParams
      );
    }

    return this.#db.all(
      `SELECT ${SELECT_ROW} FROM search_index_view
       WHERE (request_name LIKE ? OR request_path LIKE ? OR request_type LIKE ? OR request_url LIKE ?) ${workspaceClause}`,
      like, like, like, like, ...workspaceParams
    );
  }

  clear() {
    this.#db.exec('DELETE FROM search_index_entries');
    this.#db.exec('DELETE FROM search_index_meta');
    this.#db.exec('DELETE FROM search_index_folders');
    this.#db.exec('VACUUM');
    this.#db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  clearCollection(collectionPath) {
    this.#db.run('DELETE FROM search_index_entries WHERE collection_path = ?', collectionPath);
    this.#db.run('DELETE FROM search_index_meta WHERE collection_path = ?', collectionPath);
    this.#db.run('DELETE FROM search_index_folders WHERE collection_path = ?', collectionPath);
  }

  transaction(callback) {
    return this.#db.transaction(callback);
  }
}

module.exports = { SearchIndex };
