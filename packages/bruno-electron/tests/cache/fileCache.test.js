const path = require('path');
const fs = require('fs');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => {
      const path = require('path');
      const os = require('os');
      return path.join(os.tmpdir(), 'bruno-file-cache-test');
    })
  }
}));

const mockIsCacheEnabled = jest.fn(() => true);

jest.mock('../../src/store/preferences', () => ({
  preferencesUtil: {
    isCacheEnabled: mockIsCacheEnabled
  }
}));

const { FileCache } = require('../../src/cache/fileCache');

const { app } = require('electron');
const testDbDir = app.getPath('userData');
const testDbPath = path.join(testDbDir, 'file-cache-lmdb');

describe('FileCache', () => {
  let fileCache;

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      if (fs.existsSync(testDbPath)) {
        fs.rmSync(testDbPath, { recursive: true, force: true });
      }
      if (fs.existsSync(testDbDir)) {
        fs.rmdirSync(testDbDir);
      }
    } catch (err) {
    }
  });

  beforeEach(() => {
    fileCache = new FileCache();
    fileCache.initialize();
    fileCache.clearAll();
  });

  afterEach(async () => {
    if (fileCache) {
      await fileCache.close();
    }
  });

  describe('get and set', () => {
    test('returns null for non-existent key', () => {
      const result = fileCache.get('/path/to/nonexistent.bru', Date.now());
      expect(result).toBeNull();
    });

    test('returns cached data when mtime matches', () => {
      const filepath = '/test/collection/request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Test Request', type: 'http-request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      const result = fileCache.get(filepath, mtime);
      expect(result).toEqual(parsedData);
    });

    test('returns null when mtime differs (stale cache)', () => {
      const filepath = '/test/collection/request.bru';
      const originalMtime = 1234567890;
      const newMtime = 1234567999;
      const parsedData = { name: 'Test Request', type: 'http-request' };

      fileCache.set(filepath, {
        mtime: originalMtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      const result = fileCache.get(filepath, newMtime);
      expect(result).toBeNull();
    });

    test('updates cache entry on re-set with new mtime', () => {
      const filepath = '/test/collection/request.bru';
      const mtime1 = 1234567890;
      const mtime2 = 1234567999;
      const parsedData1 = { name: 'Test Request v1', type: 'http-request' };
      const parsedData2 = { name: 'Test Request v2', type: 'http-request' };

      fileCache.set(filepath, {
        mtime: mtime1,
        fileType: 'request',
        parsedData: parsedData1,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      fileCache.set(filepath, {
        mtime: mtime2,
        fileType: 'request',
        parsedData: parsedData2,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 2048
      });

      expect(fileCache.get(filepath, mtime1)).toBeNull();
      expect(fileCache.get(filepath, mtime2)).toEqual(parsedData2);
    });
  });

  describe('delete', () => {
    test('removes entry from cache', () => {
      const filepath = '/test/collection/request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Test Request', type: 'http-request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      expect(fileCache.get(filepath, mtime)).toEqual(parsedData);

      fileCache.delete(filepath);

      expect(fileCache.get(filepath, mtime)).toBeNull();
    });
  });

  describe('clearAll', () => {
    test('empties the entire cache', () => {
      const mtime = 1234567890;

      fileCache.set('/test/collection1/request1.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request 1' },
        collectionUid: 'uid-1',
        collectionPath: '/test/collection1',
        size: 1024
      });

      fileCache.set('/test/collection2/request2.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request 2' },
        collectionUid: 'uid-2',
        collectionPath: '/test/collection2',
        size: 2048
      });

      const statsBefore = fileCache.getStats();
      expect(statsBefore.fileCount).toBe(2);

      fileCache.clearAll();

      const statsAfter = fileCache.getStats();
      expect(statsAfter.fileCount).toBe(0);
      expect(statsAfter.totalSizeBytes).toBe(0);
    });
  });

  describe('getStats', () => {
    test('returns correct counts and sizes', () => {
      const mtime = 1234567890;

      fileCache.set('/test/collection1/request1.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request 1' },
        collectionUid: 'uid-1',
        collectionPath: '/test/collection1',
        size: 1000
      });

      fileCache.set('/test/collection1/request2.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request 2' },
        collectionUid: 'uid-1',
        collectionPath: '/test/collection1',
        size: 2000
      });

      fileCache.set('/test/collection2/request3.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request 3' },
        collectionUid: 'uid-2',
        collectionPath: '/test/collection2',
        size: 3000
      });

      const stats = fileCache.getStats();

      expect(stats.fileCount).toBe(3);
      expect(stats.totalSizeBytes).toBe(6000);
      expect(stats.byCollection['/test/collection1']).toEqual({ count: 2, size: 3000 });
      expect(stats.byCollection['/test/collection2']).toEqual({ count: 1, size: 3000 });
    });

    test('returns zero stats for empty cache', () => {
      const stats = fileCache.getStats();

      expect(stats.fileCount).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.byCollection).toEqual({});
    });
  });

  describe('edge cases', () => {
    test('handles special characters in filepath', () => {
      const filepath = '/test/collection/request with spaces & special (chars).bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Special Request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      expect(fileCache.get(filepath, mtime)).toEqual(parsedData);
    });

    test('handles large parsed data', () => {
      const filepath = '/test/collection/large-request.bru';
      const mtime = 1234567890;
      const parsedData = {
        name: 'Large Request',
        body: { json: 'x'.repeat(100000) }
      };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 100024
      });

      const result = fileCache.get(filepath, mtime);
      expect(result).toEqual(parsedData);
    });
  });

  describe('persistence', () => {
    test('data survives re-initialization', async () => {
      const filepath = '/test/collection/request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Persistent Request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      await fileCache.close();

      const newFileCache = new FileCache();
      newFileCache.initialize();

      const result = newFileCache.get(filepath, mtime);
      expect(result).toEqual(parsedData);

      await newFileCache.close();
    });
  });

  describe('version migration', () => {
    test('clears cache when version is missing', async () => {
      const filepath = '/test/collection/request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Test Request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      expect(fileCache.get(filepath, mtime)).toEqual(parsedData);

      fileCache.db.removeSync('__cache_version__');

      await fileCache.close();

      const newFileCache = new FileCache();
      newFileCache.initialize();

      expect(newFileCache.get(filepath, mtime)).toBeNull();
      expect(newFileCache.getStats().fileCount).toBe(0);

      await newFileCache.close();
    });

    test('getStats does not count version key', () => {
      const mtime = 1234567890;

      fileCache.set('/test/collection/request.bru', {
        mtime,
        fileType: 'request',
        parsedData: { name: 'Request' },
        collectionUid: 'uid-1',
        collectionPath: '/test/collection',
        size: 1000
      });

      const stats = fileCache.getStats();

      expect(stats.fileCount).toBe(1);
    });
  });

  describe('cache disabled', () => {
    test('get returns null when cache is disabled', () => {
      const filepath = '/test/collection/request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'Test Request' };

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      expect(fileCache.get(filepath, mtime)).toEqual(parsedData);

      mockIsCacheEnabled.mockReturnValue(false);
      expect(fileCache.get(filepath, mtime)).toBeNull();

      mockIsCacheEnabled.mockReturnValue(true);
    });

    test('set does nothing when cache is disabled', () => {
      const filepath = '/test/collection/new-request.bru';
      const mtime = 1234567890;
      const parsedData = { name: 'New Request' };

      mockIsCacheEnabled.mockReturnValue(false);

      fileCache.set(filepath, {
        mtime,
        fileType: 'request',
        parsedData,
        collectionUid: 'uid-123',
        collectionPath: '/test/collection',
        size: 1024
      });

      mockIsCacheEnabled.mockReturnValue(true);

      expect(fileCache.get(filepath, mtime)).toBeNull();
    });
  });
});
