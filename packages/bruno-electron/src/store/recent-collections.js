const path = require('node:path');
const _ = require('lodash');
const Store = require('electron-store');
const { transientManager } = require('../services/transient');

const STORE_VERSION = 1;
const MAX_ROWS = 50;
const MAX_NAME_LENGTH = 256;
const MAX_TIMESTAMP = 8.64e15;
const LAST_EVENTS = ['opened', 'closed'];

const toName = (value) => (typeof value === 'string' && value.trim() !== '' ? value.slice(0, MAX_NAME_LENGTH) : '');

const isUsedAt = (value) => Number.isInteger(value) && value >= 1 && value <= MAX_TIMESTAMP;

class RecentCollectionsStore {
  #platform;
  #pathApi;
  #store = null;
  #hasWarnedNewerVersion = false;

  constructor({ platform = process.platform } = {}) {
    this.#platform = platform;
    this.#pathApi = platform === 'win32' ? path.win32 : path.posix;
  }

  list() {
    return this.#read().rows;
  }

  record(collections, lastEvent) {
    return this.#update('record', (rows) => {
      const usedAt = Date.now();
      let nextRows = rows;
      [...collections].reverse().forEach((collection) => {
        const entry = this.#toEntry(collection.path);
        if (!entry) {
          return;
        }
        const existing = nextRows.find((row) => this.#toKey(row.path) === entry.key);
        const name = toName(collection.name) || existing?.name || this.#folderName(entry.path);
        nextRows = [{ path: entry.path, name, usedAt, lastEvent }, ...nextRows.filter((row) => row !== existing)];
      });
      return nextRows === rows ? null : nextRows;
    });
  }

  forget(paths) {
    return this.#update('forget', (rows) => {
      const forgotten = paths.map((value) => this.#findRow(rows, value)).filter(Boolean);
      return forgotten.length === 0 ? null : rows.filter((row) => !forgotten.includes(row));
    });
  }

  move(fromPath, toPath) {
    return this.#update('move', (rows) => {
      const moved = this.#findRow(rows, fromPath);
      const target = this.#toEntry(toPath);
      if (!moved || !target) {
        return null;
      }
      return rows
        .filter((row) => row === moved || this.#toKey(row.path) !== target.key)
        .map((row) => (row === moved ? { ...row, path: target.path } : row));
    });
  }

  rename(collectionPath, name) {
    return this.#update('rename', (rows) => {
      const renamed = this.#findRow(rows, collectionPath);
      const nextName = toName(name);
      if (!renamed || !nextName || renamed.name === nextName) {
        return null;
      }
      return rows.map((row) => (row === renamed ? { ...row, name: nextName } : row));
    });
  }

  #getStore() {
    if (!this.#store) {
      this.#store = new Store({ name: 'recent-collections', clearInvalidConfig: true });
    }
    return this.#store;
  }

  #read() {
    const { version, recent } = this.#getStore().store;
    const isNewer = typeof version === 'number' && version > STORE_VERSION;
    const isKnown = (version === STORE_VERSION || isNewer) && Array.isArray(recent);
    return { rows: isKnown ? this.#cleanRows(recent) : [], isWritable: !isNewer };
  }

  #update(action, change) {
    try {
      const { rows, isWritable } = this.#read();
      if (!isWritable) {
        this.#warnNewerVersion();
        return false;
      }
      const nextRows = change(rows);
      if (!nextRows) {
        return false;
      }
      this.#getStore().set({ version: STORE_VERSION, recent: nextRows.slice(0, MAX_ROWS) });
      return true;
    } catch (error) {
      console.error(`[recent-collections] ${action} failed:`, error);
      return false;
    }
  }

  #cleanRows(recent) {
    const rows = recent.map((value) => this.#cleanRow(value)).filter(Boolean);
    return _.uniqBy(rows, (row) => this.#toKey(row.path)).slice(0, MAX_ROWS);
  }

  #cleanRow(value) {
    const entry = this.#toEntry(value?.path);
    if (!entry || !isUsedAt(value.usedAt)) {
      return null;
    }
    return {
      path: entry.path,
      name: toName(value.name) || this.#folderName(entry.path),
      usedAt: value.usedAt,
      lastEvent: LAST_EVENTS.includes(value.lastEvent) ? value.lastEvent : 'opened'
    };
  }

  #toEntry(value) {
    if (typeof value !== 'string' || !this.#pathApi.isAbsolute(value)) {
      return null;
    }
    const resolvedPath = this.#pathApi.resolve(value);
    const key = this.#toKey(resolvedPath);
    const transientKey = this.#toKey(this.#pathApi.resolve(transientManager.getRootDirectory()));
    if (key === transientKey || key.startsWith(`${transientKey}${this.#pathApi.sep}`)) {
      return null;
    }
    return { path: resolvedPath, key };
  }

  #findRow(rows, value) {
    const entry = this.#toEntry(value);
    return entry ? rows.find((row) => this.#toKey(row.path) === entry.key) : undefined;
  }

  #toKey(resolvedPath) {
    return this.#platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
  }

  #folderName(resolvedPath) {
    return this.#pathApi.basename(resolvedPath) || resolvedPath;
  }

  #warnNewerVersion() {
    if (!this.#hasWarnedNewerVersion) {
      this.#hasWarnedNewerVersion = true;
      console.warn('[recent-collections] recent-collections.json was written by a newer Bruno; leaving it untouched');
    }
  }
}

const recentCollectionsStore = new RecentCollectionsStore();

module.exports = {
  RecentCollectionsStore,
  recentCollectionsStore
};
