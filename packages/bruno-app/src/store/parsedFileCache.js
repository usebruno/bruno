import { openDB } from 'idb';

const DB_NAME = 'bruno-parsed-file-cache';
const STORE_NAME = 'parsedFiles';
const DB_VERSION = 1;
const CACHE_VERSION = '1.0.0';
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('collectionPath', 'collectionPath');
          store.createIndex('parsedAt', 'parsedAt');
        }
      }
    });
  }
  return dbPromise;
};

const generateKey = (collectionPath, filePath) => {
  return `${collectionPath}↝${filePath}`;
};

export const parsedFileCacheStore = {
  async getEntry(collectionPath, filePath) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      const entry = await db.get(STORE_NAME, key);

      if (entry && typeof entry.mtimeMs === 'number' && entry.parsedData) {
        return {
          mtimeMs: entry.mtimeMs,
          parsedData: entry.parsedData
        };
      }
    } catch (error) {
      console.error('ParsedFileCacheStore: Error reading cache entry:', error);
    }
    return null;
  },

  async setEntry(collectionPath, filePath, entry) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      const cacheEntry = {
        key,
        collectionPath,
        filePath,
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData,
        parsedAt: Date.now()
      };
      await db.put(STORE_NAME, cacheEntry);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error writing cache entry:', error);
    }
  },

  async invalidate(collectionPath, filePath) {
    try {
      const db = await getDB();
      const key = generateKey(collectionPath, filePath);
      await db.delete(STORE_NAME, key);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating cache entry:', error);
    }
  },

  async invalidateCollection(collectionPath) {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('collectionPath');

      let cursor = await index.openCursor(IDBKeyRange.only(collectionPath));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating collection cache:', error);
    }
  },

  async invalidateDirectory(collectionPath, dirPath) {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('collectionPath');

      let cursor = await index.openCursor(IDBKeyRange.only(collectionPath));
      while (cursor) {
        if (cursor.value.filePath.startsWith(dirPath)) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error invalidating directory cache:', error);
    }
  },

  async moveEntry(collectionPath, oldFilePath, newFilePath) {
    const entry = await this.getEntry(collectionPath, oldFilePath);
    if (entry) {
      await this.invalidate(collectionPath, oldFilePath);
      await this.setEntry(collectionPath, newFilePath, {
        mtimeMs: entry.mtimeMs,
        parsedData: entry.parsedData
      });
    }
  },

  async prune(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    try {
      const db = await getDB();
      const cutoff = Date.now() - maxAgeMs;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('parsedAt');

      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch (error) {
      console.error('ParsedFileCacheStore: Error pruning cache:', error);
    }
  },

  async clear() {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('ParsedFileCacheStore: Error clearing cache:', error);
    }
  },

  async getStats() {
    try {
      const db = await getDB();

      // Use count() for O(1) total files count
      const totalFiles = await db.count(STORE_NAME);

      // Count unique collections using index with unique cursor
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('collectionPath');
      let totalCollections = 0;

      // Use openKeyCursor with 'nextunique' to count unique collection paths
      let cursor = await index.openKeyCursor(null, 'nextunique');
      while (cursor) {
        totalCollections++;
        cursor = await cursor.continue();
      }

      return {
        version: CACHE_VERSION,
        totalCollections,
        totalFiles
      };
    } catch (error) {
      console.error('ParsedFileCacheStore: Error getting stats:', error);
      return {
        version: CACHE_VERSION,
        totalCollections: 0,
        totalFiles: 0,
        error: error.message
      };
    }
  }
};

export default parsedFileCacheStore;
