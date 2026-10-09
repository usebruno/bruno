const fs = require('node:fs');
const path = require('node:path');
const { getStatements, transaction } = require('../sqlite');
const scanCollection = require('../pool/jobs/scan-collection');
const {
  hashFile,
  posixifyPath,
  idForAbsolutePath,
  resolveDenylist,
  isDenied
} = require('../../utils/mount');

// TODO: Check for trigger (ON UPDATE) and then see if we can use that to update updated_at

class FileIndex {
  #statements;
  #applicationVersion;

  constructor() {
    this.#statements = getStatements();
    this.#applicationVersion = require('electron').app.getVersion();
  }

  async status(collectionPath, options = {}) {
    const request = {
      collectionPath,
      denylist: resolveDenylist(options.denylist),
      saved: [...this.#loadMetadata(collectionPath).values()]
    };
    return (options.run || scanCollection)(request);
  }

  clearCollection(collectionPath) {
    this.#statements.execute('file_index_clear_collection', { collection_path: collectionPath });
  }

  entries(collectionPath, options = {}) {
    const denylist = resolveDenylist(options.denylist);
    const rows = this.#statements.execute('file_index_content_for_collection', {
      collection_path: collectionPath
    });
    const map = new Map();
    for (const row of rows) {
      if (isDenied(posixifyPath(row.relativePath), denylist)) continue;
      map.set(row.relativePath, { data: JSON.parse(row.data), raw: row.raw });
    }
    return map;
  }

  // The same entries with the `mtime` and `hash` each one was saved with, so a caller can tell whether a saved copy
  // still matches the file on disk
  entriesWithMetadata(collectionPath, options = {}) {
    const metadata = this.#loadMetadata(collectionPath);
    const entries = this.entries(collectionPath, options);
    for (const [relativePath, entry] of entries) {
      const saved = metadata.get(relativePath);
      if (saved) Object.assign(entry, { mtime: saved.mtime, hash: saved.hash });
    }
    return entries;
  }

  entryWithMetadata(collectionPath, relativePath) {
    const row = this.#statements.execute('file_index_entry_for_path', {
      collection_path: collectionPath,
      relative_path: relativePath
    });
    if (!row) return null;
    return { data: JSON.parse(row.data), raw: row.raw, mtime: row.mtime, hash: row.hash };
  }

  stage(collectionPath, entry) {
    const root = collectionPath;
    const { op } = entry;
    const relativePath = entry.relativePath;

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
    const mtime = stat.mtimeNs;
    const hash = hashFile(absolutePath);
    this.stage(target.root, {
      op: 'add',
      relativePath: target.relativePath,
      mtime,
      hash,
      raw: fs.readFileSync(absolutePath, 'utf8'),
      data
    });
    // the same mtime/hash that were saved, so a caller (the search index) can use them without reading the file again
    return { mtime, hash };
  }

  unstagePath(collectionPath, absolutePath) {
    const target = this.#resolveTarget(collectionPath, absolutePath);
    if (!target) return;
    this.stage(target.root, { op: 'remove', relativePath: target.relativePath });
  }

  #resolveTarget(collectionPath, absolutePath) {
    const root = collectionPath;
    const relativePath = path.relative(root, absolutePath);
    const escapesRoot = relativePath === '..' || relativePath.startsWith(`..${path.sep}`);
    if (escapesRoot || path.isAbsolute(relativePath)) return null;
    return { root, relativePath };
  }

  transaction(callback) {
    return transaction(callback);
  }

  #loadMetadata(collectionPath) {
    const rows = this.#statements.execute('file_index_metadata_for_collection', {
      collection_path: collectionPath
    });
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
