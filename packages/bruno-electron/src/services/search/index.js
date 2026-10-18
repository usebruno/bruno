const path = require('node:path');
const { utilityProcess } = require('electron');
const { FileIndex } = require('../mount/file-index');
const { buildTree } = require('../mount/tree-builder');
const { defaultClassify, FOLDER_ROOT_BASENAMES } = require('../../utils/mount');
const { preferencesUtil } = require('../../store/preferences');

const RIPGREP_PROCESS_FILE = path.join(__dirname, 'ripgrep-process.js');

const toTreeEntry = (relativePath, data = {}, error) => {
  const treeData = defaultClassify(relativePath)?.type === 'folder'
    ? { meta: { name: data.meta?.name, seq: data.meta?.seq } }
    : { name: data.name, type: data.type, seq: data.seq, request: { method: data.request?.method } };
  return error ? { data: treeData, error: { message: error.message } } : { data: treeData };
};

const withFolderFiles = (probedDirs, relativePaths) => {
  const files = new Set(relativePaths);
  for (const relativePath of relativePaths) {
    for (let dir = path.dirname(relativePath); dir !== '.' && !probedDirs.has(dir); dir = path.dirname(dir)) {
      probedDirs.add(dir);
      for (const basename of FOLDER_ROOT_BASENAMES) files.add(path.join(dir, basename));
    }
  }
  return [...files];
};

class SearchService {
  #host = null;
  #onMessage = null;
  #pendingParses = new Map();
  #nextId = 0;
  #nextParseId = 0;
  #window = null;
  #fileIndex = null;

  #getHost() {
    if (this.#host) return this.#host;

    const host = utilityProcess.fork(RIPGREP_PROCESS_FILE, [], { serviceName: 'Bruno Search' });
    host.on('message', (message) => {
      if (message.type === 'parsed') {
        this.#pendingParses.get(message.requestId)?.resolve(message.results);
        this.#pendingParses.delete(message.requestId);
        return;
      }
      if (message.id === this.#nextId) this.#onMessage?.(message);
    });
    host.on('exit', () => {
      if (this.#host !== host) return;
      this.#host = null;
      for (const { reject } of this.#pendingParses.values()) reject(new Error('Search process exited'));
      this.#pendingParses.clear();
    });

    this.#host = host;
    return host;
  }

  #getFileIndex() {
    if (!this.#fileIndex) this.#fileIndex = new FileIndex();
    return this.#fileIndex;
  }

  warmup() {
    this.#getHost();
  }

  search({ roots, query }, onMessage) {
    const id = ++this.#nextId;
    this.#window = null;
    this.#onMessage = onMessage;
    this.#getHost().postMessage({ type: 'search', id, roots, query });
    return id;
  }

  cancel() {
    this.#window = null;
    this.#onMessage = null;
    this.#host?.postMessage({ type: 'cancel' });
  }

  async resolveWindow({ id, collectionPath, relativePaths }) {
    if (id !== this.#nextId) return { stale: true };
    if (this.#window?.id !== id) this.#window = { id, collections: new Map() };
    let collection = this.#window.collections.get(collectionPath);
    if (!collection) {
      collection = { resolved: new Set(), probedDirs: new Set() };
      this.#window.collections.set(collectionPath, collection);
    }

    const wanted = withFolderFiles(collection.probedDirs, relativePaths).filter((relativePath) => !collection.resolved.has(relativePath));
    const fileIndex = preferencesUtil.isFileCacheEnabled() ? this.#getFileIndex() : null;
    const { cached, stale } = fileIndex
      ? await this.#checkFileIndex(fileIndex, collectionPath, wanted)
      : { cached: new Map(), stale: wanted };
    const parsed = stale.length ? await this.#parse(collectionPath, stale) : [];
    if (id !== this.#nextId) return { stale: true };

    if (fileIndex) this.#stage(fileIndex, collectionPath, parsed);
    const windowEntries = new Map();
    for (const [relativePath, data] of cached) windowEntries.set(relativePath, toTreeEntry(relativePath, data));
    for (const { relativePath, data, error } of parsed) windowEntries.set(relativePath, toTreeEntry(relativePath, data, error));
    for (const relativePath of windowEntries.keys()) collection.resolved.add(relativePath);

    const { getRequestUid } = require('../../cache/requestUids');
    return { items: buildTree(collectionPath, windowEntries, { uidFor: getRequestUid }).items };
  }

  async #checkFileIndex(fileIndex, collectionPath, relativePaths) {
    try {
      return await fileIndex.statusFor(collectionPath, relativePaths);
    } catch (err) {
      console.warn('[search] file index unavailable, parsing the window instead', err);
      return { cached: new Map(), stale: relativePaths };
    }
  }

  #parse(collectionPath, relativePaths) {
    const requestId = ++this.#nextParseId;
    const files = relativePaths.map((relativePath) => ({ relativePath, ...defaultClassify(relativePath) }));
    return new Promise((resolve, reject) => {
      this.#pendingParses.set(requestId, { resolve, reject });
      this.#getHost().postMessage({ type: 'parse', requestId, collectionPath, files });
    });
  }

  #stage(fileIndex, collectionPath, parsed) {
    try {
      fileIndex.transaction(() => {
        for (const { relativePath, mtime, hash, data, raw, error } of parsed) {
          if (!error) fileIndex.stage(collectionPath, { op: 'add', relativePath, mtime, hash, data, raw });
        }
      });
    } catch (err) {
      console.warn('[search] failed to stage parsed files into the file index', err);
    }
  }

  shutdown() {
    this.#onMessage = null;
    const host = this.#host;
    this.#host = null;
    host?.kill();
  }
}

module.exports = { SearchService };
