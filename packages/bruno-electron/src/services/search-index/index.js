const path = require('node:path');
const { getStatements, transaction } = require('../sqlite');

// The search index lives in the shared database (bruno.db). Its tables, views and statements are defined in
// @usebruno/sqlite (migrations/0000005_search_index.ts, statements/search-index.sql).
class SearchIndex {
  #execute(name, params) {
    return getStatements().execute(name, params);
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

    this.#execute('search_index_upsert_entry', {
      collection_path: collectionPath,
      collection_name: collectionName,
      folder_path: folderPath ?? null,
      folder_name: folderName ?? null,
      request_path: requestPath,
      request_name: requestName,
      request_type: requestType ?? null,
      request_url: requestUrl ?? null,
      request_protocol: requestProtocol ?? null,
      request_seq: requestSeq ?? null,
      request_error: requestError ?? null,
      workspace_path: workspacePath ?? null,
      mtime,
      hash
    });
  }

  remove(collectionPath, requestPath) {
    this.#execute('search_index_delete_entry', { collection_path: collectionPath, request_path: requestPath });
  }

  collectionNameFor(collectionPath) {
    const row = this.#execute('search_index_collection_name', { collection_path: collectionPath });
    return row?.collectionName ?? null;
  }

  metaEntriesFor(collectionPath) {
    const rows = this.#execute('search_index_meta_entries', { collection_path: collectionPath });
    return new Map(rows.map((row) => [row.relativePath, row]));
  }

  upsertMeta({ collectionPath, relativePath, kind, folderPath, name, seq, mtime, hash }) {
    this.#execute('search_index_upsert_meta', {
      collection_path: collectionPath,
      relative_path: relativePath,
      kind,
      folder_path: folderPath,
      name: name ?? null,
      seq: seq ?? null,
      mtime,
      hash
    });
  }

  removeMeta(collectionPath, relativePath) {
    this.#execute('search_index_delete_meta', { collection_path: collectionPath, relative_path: relativePath });
  }

  foldersFor(collectionPath) {
    return this.#execute('search_index_folders_for_collection', { collection_path: collectionPath });
  }

  // Adds the folders (and keeps their names/workspace current); never removes any
  addFolders({ collectionPath, collectionName, workspacePath, folderPaths }) {
    for (const folderPath of folderPaths) {
      this.#execute('search_index_upsert_folder', {
        collection_path: collectionPath,
        collection_name: collectionName,
        folder_path: folderPath,
        folder_name: path.basename(folderPath),
        workspace_path: workspacePath ?? null
      });
    }
  }

  // Makes the stored folders exactly the given ones
  syncFolders({ collectionPath, collectionName, workspacePath, folderPaths }) {
    const wanted = new Set(folderPaths);
    transaction(() => {
      this.addFolders({ collectionPath, collectionName, workspacePath, folderPaths });
      const stored = this.#execute('search_index_folder_paths', { collection_path: collectionPath });
      for (const { folderPath } of stored) {
        if (!wanted.has(folderPath)) {
          this.#execute('search_index_delete_folder', { collection_path: collectionPath, folder_path: folderPath });
        }
      }
    });
  }

  // Removes a folder and everything under it
  removeFolderTree(collectionPath, folderPath) {
    const prefix = `${folderPath}${path.sep}`;
    this.#execute('search_index_delete_folder_tree', {
      collection_path: collectionPath,
      folder_path: folderPath,
      prefix_length: prefix.length,
      prefix
    });
  }

  entriesFor(collectionPath) {
    const rows = this.#execute('search_index_entries_metadata', { collection_path: collectionPath });
    return new Map(rows.map((row) => [row.requestPath, row]));
  }

  collectionPaths() {
    return this.#execute('search_index_collection_paths').map((row) => row.collectionPath);
  }

  rowsForCollection(collectionPath) {
    return this.#execute('search_index_rows_for_collection', { collection_path: collectionPath });
  }

  search(term, { scope = 'request', workspacePath } = {}) {
    const params = { like: `%${term}%`, workspace_path: workspacePath ?? null };

    if (scope === 'collection') return this.#execute('search_index_search_collections', params);
    if (scope === 'folder') return this.#execute('search_index_search_folders', params);
    return this.#execute('search_index_search_requests', params);
  }

  // Bytes of text the index holds (not the size of the shared database file)
  size() {
    return Number(this.#execute('search_index_size')?.bytes ?? 0);
  }

  clear() {
    transaction(() => {
      this.#execute('search_index_clear_entries');
      this.#execute('search_index_clear_meta');
      this.#execute('search_index_clear_folders');
    });
  }

  clearCollection(collectionPath) {
    const params = { collection_path: collectionPath };
    transaction(() => {
      this.#execute('search_index_clear_collection_entries', params);
      this.#execute('search_index_clear_collection_meta', params);
      this.#execute('search_index_clear_collection_folders', params);
    });
  }

  transaction(callback) {
    return transaction(callback);
  }
}

module.exports = { SearchIndex };
