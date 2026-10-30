const path = require('node:path');
const { getStatements, transaction } = require('../sqlite');
const { defaultClassify } = require('../../utils/mount');

const NAMING_TYPES = new Set(['config', 'collection', 'folder']);

const likePattern = (term) => `%${String(term ?? '').replace(/[\\%_]/g, '\\$&')}%`;

class SearchIndex {
  #revision = 0;

  get revision() {
    return this.#revision;
  }

  #execute(name, params) {
    return getStatements().execute(name, params);
  }

  #mutate(name, params) {
    const result = this.#execute(name, params);
    const changes = typeof result?.changes === 'number' ? result.changes : 1;
    if (changes > 0) this.#revision += 1;
    return changes > 0;
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

    return this.#mutate('search_index_upsert_entry', {
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
    return this.#mutate('search_index_delete_entry', { collection_path: collectionPath, request_path: requestPath });
  }

  collectionNameFor(collectionPath) {
    const row = this.#execute('search_index_collection_name', { collection_path: collectionPath });
    return row?.collectionName ?? null;
  }

  upsertMeta({ collectionPath, relativePath, entity, folderPath, name, seq, mtime, hash }) {
    if (entity === 'folder') {
      return this.#nameFolder({ collectionPath, folderPath, name, seq, sourcePath: relativePath, mtime, hash });
    }
    return this.#nameCollection({ collectionPath, name, sourcePath: relativePath, mtime, hash });
  }

  removeMeta(collectionPath, relativePath) {
    if (!NAMING_TYPES.has(defaultClassify(relativePath)?.type)) return false;
    const owner = this.#execute('search_index_naming_owner', { collection_path: collectionPath, source_path: relativePath });
    if (!owner) return false;
    if (owner.entity === 'folder') {
      return this.#nameFolder({ collectionPath, folderPath: owner.path, name: null, seq: null, sourcePath: null, mtime: null, hash: null });
    }
    return this.#mutate('search_index_clear_naming', { collection_path: collectionPath, source_path: relativePath });
  }

  #nameFolder({ collectionPath, folderPath, name, seq, sourcePath, mtime, hash }) {
    const folderName = name || path.basename(folderPath);
    let changed = this.#mutate('search_index_name_folder', {
      collection_path: collectionPath,
      folder_path: folderPath,
      folder_name: folderName,
      collection_name: this.collectionNameFor(collectionPath) ?? path.basename(collectionPath),
      seq: seq ?? null,
      source_path: sourcePath ?? null,
      mtime: mtime ?? null,
      hash: hash ?? null
    });
    changed = this.#mutate('search_index_apply_folder_name', {
      collection_path: collectionPath,
      folder_path: folderPath,
      folder_name: folderName
    }) || changed;
    return changed;
  }

  #nameCollection({ collectionPath, name, sourcePath, mtime, hash }) {
    const sourceType = defaultClassify(sourcePath)?.type;
    if (sourceType === 'collection' && !name) return false;
    const current = this.#execute('search_index_collection_source', { collection_path: collectionPath });
    const currentIsCollectionFile = current?.sourcePath && defaultClassify(current.sourcePath)?.type === 'collection';
    if (sourceType === 'config' && currentIsCollectionFile && current.sourcePath !== sourcePath) return false;

    const before = this.collectionNameFor(collectionPath);
    let changed = this.#mutate('search_index_name_collection', {
      collection_path: collectionPath,
      name: name || null,
      fallback_name: path.basename(collectionPath),
      source_path: sourcePath,
      mtime: mtime ?? null,
      hash: hash ?? null
    });
    const after = this.collectionNameFor(collectionPath);
    if (after !== before) {
      changed = this.#mutate('search_index_apply_collection_name', { collection_path: collectionPath, collection_name: after }) || changed;
    }
    return changed;
  }

  foldersFor(collectionPath) {
    return this.#execute('search_index_folders_for_collection', { collection_path: collectionPath });
  }

  // Adds the folders (and keeps their names/workspace current); never removes any
  // Makes the stored folders exactly the given ones
  // Removes a folder and everything under it
  entriesFor(collectionPath) {
    const rows = this.#execute('search_index_entries_metadata', { collection_path: collectionPath });
    return new Map(rows.map((row) => [row.requestPath, row]));
  }

  rowsForCollection(collectionPath) {
    return this.#execute('search_index_rows_for_collection', { collection_path: collectionPath });
  }

  countRequestsInCollection(term, collectionPath, { workspacePath } = {}) {
    const row = this.#execute('search_index_count_requests_in_collection', {
      like: likePattern(term),
      collection_path: collectionPath,
      workspace_path: workspacePath ?? null
    });
    return Number(row?.total ?? 0);
  }

  // Bytes of text the index holds (not the size of the shared database file)
  size() {
    return Number(this.#execute('search_index_size')?.bytes ?? 0);
  }

  clear() {
    this.#mutate('search_index_clear');
  }

  clearCollection(collectionPath) {
    this.#mutate('search_index_clear_collection', { collection_path: collectionPath });
  }

  transaction(callback) {
    return transaction(callback);
  }
}

let instance = null;
const getSearchIndex = () => {
  if (!instance) instance = new SearchIndex();
  return instance;
};

module.exports = { SearchIndex, getSearchIndex };
