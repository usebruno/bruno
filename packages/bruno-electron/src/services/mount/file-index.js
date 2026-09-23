const fs = require('node:fs');
const path = require('node:path');
const { getStatements, getDatabase } = require('../../ipc/sqlite');
const {
  hashFile,
  hashFileAsync,
  posixifyPath,
  idForAbsolutePath,
  resolveDenylist,
  isDenied,
  walk
} = require('../../utils/mount');

// TODO: Check for trigger (ON UPDATE) and then see if we can use that to update updated_at

class FileIndex {
  #statements;
  #db;
  #applicationVersion;

  constructor() {
    this.#statements = getStatements();
    this.#db = getDatabase();
    if (!this.#statements || !this.#db) {
      throw new Error('the file cache is unavailable: the sqlite database is not open');
    }
    this.#applicationVersion = require('electron').app.getVersion();
  }

  async status(collectionPath, options = {}) {
    const root = collectionPath;
    const metadata = this.#loadMetadata(root);
    const denylist = resolveDenylist(options.denylist);
    const added = [];
    const updated = [];
    const removed = [];
    const seen = new Set();

    const files = walk(root, denylist);
    const results = await Promise.all(files.map(async ({ relativePath, absolutePath }) => {
      const stat = await fs.promises.stat(absolutePath, { bigint: true });
      const mtime = stat.mtimeNs;
      const prior = metadata.get(relativePath);

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

    for (const [relativePath, row] of metadata) {
      if (seen.has(relativePath)) continue;
      if (isDenied(posixifyPath(relativePath), denylist)) continue;
      removed.push({ relativePath, id: row.id, hash: row.hash });
    }

    return { added, updated, removed };
  }

  clearCollection(collectionPath) {
    this.#statements.execute('file_index_clear_collection', { collection_path: collectionPath });
  }

  entries(collectionPath) {
    const rows = this.#statements.execute('file_index_content_for_collection', {
      collection_path: collectionPath
    });
    const map = new Map();
    for (const row of rows) {
      map.set(row.relativePath, { data: JSON.parse(row.data), raw: row.raw });
    }
    return map;
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
    this.stage(target.root, {
      op: 'add',
      relativePath: target.relativePath,
      mtime: stat.mtimeNs,
      hash: hashFile(absolutePath),
      raw: fs.readFileSync(absolutePath, 'utf8'),
      data
    });
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
    return this.#db._transaction(callback);
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
