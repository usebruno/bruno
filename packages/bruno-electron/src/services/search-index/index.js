const path = require('node:path');
const { getStatements, transaction } = require('../sqlite');
const { defaultClassify } = require('../../utils/mount');

const NAMING_TYPES = new Set(['config', 'collection', 'folder']);

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

  upsertMeta({ collectionPath, relativePath, entity, folderPath, name, seq, mtime, hash }) {
    if (entity === 'folder') {
      this.#nameFolder({ collectionPath, folderPath, name, seq, sourcePath: relativePath, mtime, hash });
      return;
    }
    this.#nameCollection({ collectionPath, name, sourcePath: relativePath, mtime, hash });
  }

  removeMeta(collectionPath, relativePath) {
    if (!NAMING_TYPES.has(defaultClassify(relativePath)?.type)) return;
    const owner = this.#execute('search_index_naming_owner', { collection_path: collectionPath, source_path: relativePath });
    if (!owner) return;
    if (owner.entity === 'folder') {
      this.#nameFolder({ collectionPath, folderPath: owner.path, name: null, seq: null, sourcePath: null, mtime: null, hash: null });
      return;
    }
    this.#execute('search_index_clear_naming', { collection_path: collectionPath, source_path: relativePath });
  }

  #nameFolder({ collectionPath, folderPath, name, seq, sourcePath, mtime, hash }) {
    const folderName = name || path.basename(folderPath);
    this.#execute('search_index_name_folder', {
      collection_path: collectionPath,
      folder_path: folderPath,
      folder_name: folderName,
      collection_name: this.collectionNameFor(collectionPath) ?? path.basename(collectionPath),
      seq: seq ?? null,
      source_path: sourcePath ?? null,
      mtime: mtime ?? null,
      hash: hash ?? null
    });
    this.#execute('search_index_apply_folder_name', {
      collection_path: collectionPath,
      folder_path: folderPath,
      folder_name: folderName
    });
  }

  #nameCollection({ collectionPath, name, sourcePath, mtime, hash }) {
    const sourceType = defaultClassify(sourcePath)?.type;
    if (sourceType === 'collection' && !name) return;
    const current = this.#execute('search_index_collection_source', { collection_path: collectionPath });
    const currentIsCollectionFile = current?.sourcePath && defaultClassify(current.sourcePath)?.type === 'collection';
    if (sourceType === 'config' && currentIsCollectionFile && current.sourcePath !== sourcePath) return;

    const before = this.collectionNameFor(collectionPath);
    this.#execute('search_index_name_collection', {
      collection_path: collectionPath,
      name: name || null,
      fallback_name: path.basename(collectionPath),
      source_path: sourcePath,
      mtime: mtime ?? null,
      hash: hash ?? null
    });
    const after = this.collectionNameFor(collectionPath);
    if (after !== before) {
      this.#execute('search_index_apply_collection_name', { collection_path: collectionPath, collection_name: after });
    }
  }

  foldersFor(collectionPath) {
    return this.#execute('search_index_folders_for_collection', { collection_path: collectionPath });
  }

  // Adds the folders (and keeps their names/workspace current); never removes any
  addFolders({ collectionPath, collectionName, workspacePath, folderPaths }) {
    const before = this.collectionNameFor(collectionPath);
    this.#execute('search_index_upsert_collection', {
      collection_path: collectionPath,
      collection_name: collectionName,
      workspace_path: workspacePath ?? null
    });
    const resolvedName = this.collectionNameFor(collectionPath);
    if (before !== null && resolvedName !== before) {
      this.#execute('search_index_apply_collection_name', { collection_path: collectionPath, collection_name: resolvedName });
    }

    for (const folderPath of folderPaths) {
      this.#execute('search_index_upsert_folder', {
        collection_path: collectionPath,
        collection_name: resolvedName,
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
    this.#execute('search_index_clear');
  }

  clearCollection(collectionPath) {
    this.#execute('search_index_clear_collection', { collection_path: collectionPath });
  }

  transaction(callback) {
    return transaction(callback);
  }
}

module.exports = { SearchIndex };
