const fs = require('node:fs');
const path = require('path');
const { app } = require('electron');
const { createDatabase } = require('@usebruno/sqlite');

let service = null;

const LEGACY_FILE_INDEX_DB = 'mount-snapshots.db';
const LEGACY_FILE_INDEX_SUFFIXES = ['', '-journal', '-wal', '-shm'];

const removeLegacyFileIndex = () => {
  const legacyPath = path.join(app.getPath('userData'), LEGACY_FILE_INDEX_DB);
  if (!fs.existsSync(legacyPath)) return;

  for (const suffix of LEGACY_FILE_INDEX_SUFFIXES) {
    try {
      fs.rmSync(legacyPath + suffix, { force: true, maxRetries: 3 });
    } catch (err) {
      console.warn(`failed to remove ${LEGACY_FILE_INDEX_DB}${suffix}: `, err);
    }
  }
};

class SqliteService {
  _db = null;
  _statements = null;
  constructor() {
    const { db, statements } = createDatabase(path.join(app.getPath('userData'), 'bruno.db'), {
      pragmas: { auto_vacuum: 'INCREMENTAL', journal_mode: 'WAL' }
    });
    this._db = db;
    this._statements = statements;
    removeLegacyFileIndex();
  }

  get statements() {
    return this._statements;
  }

  get db() {
    return this._db;
  }

  shutdown() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._statements = null;
    }
  }

  async reclaimDiskSpace({
    pagesBatchSize = 500,
    pagesBatchDelayMs = 30,
    maxReclaimDurationMs = 4000,
    busyTimeoutMs = 500
  } = {}) {
    const raw = this._db?._db;
    if (!raw) return;

    try {
      raw.exec(`PRAGMA busy_timeout = ${busyTimeoutMs}`);

      if (raw.prepare('PRAGMA auto_vacuum').get().auto_vacuum !== 2) {
        raw.exec('VACUUM');
      }

      const start = Date.now();
      while (Date.now() - start < maxReclaimDurationMs) {
        if (raw.prepare('PRAGMA freelist_count').get().freelist_count === 0) break;
        try {
          raw.exec(`PRAGMA incremental_vacuum(${pagesBatchSize})`);
        } catch (err) { }
        await new Promise((resolve) => setTimeout(resolve, pagesBatchDelayMs));
      }
    } catch (err) {
      console.warn('failed to reclaim disk space: ', err);
    }
  }
}

const openDatabase = () => {
  if (service) return;
  service = new SqliteService();
};

const shutdown = () => {
  if (service) {
    service.shutdown();
    service = null;
  }
};

const unavailable = (operation) => {
  console.warn(`[sqlite] the database is unavailable, skipped ${operation}`);
  return new Error(`The database is unavailable, cannot run ${operation}`);
};

const unavailableStatements = {
  execute(name) {
    throw unavailable(`statement "${name}"`);
  }
};

const getStatements = () => service?.statements ?? unavailableStatements;

const transaction = (callback) => {
  const db = service?.db;
  if (!db) throw unavailable('a transaction');
  return db._transaction(callback);
};

const reclaimDiskSpace = (options) => (service ? service.reclaimDiskSpace(options) : Promise.resolve());

module.exports = { openDatabase, shutdown, getStatements, transaction, reclaimDiskSpace };
