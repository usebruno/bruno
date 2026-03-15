const path = require('path');
const fs = require('fs');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/userData')
  }
}));

const createTransientManager = () => {
  jest.resetModules();
  return require('../../src/services/transient/index');
};

describe('TransientRequestManager', () => {
  let transientManager;
  let mockBasePath;
  let mockMappingPath;

  beforeEach(() => {
    jest.clearAllMocks();
    transientManager = createTransientManager();
    mockBasePath = path.join('/mock/userData', 'tmp', 'transient');
    mockMappingPath = path.join('/mock/userData', 'transient-mapping.json');
  });

  describe('getBasePath', () => {
    test('returns correct base path', () => {
      const basePath = transientManager.getBasePath();
      expect(basePath).toBe(mockBasePath);
    });
  });

  describe('getMappingPath', () => {
    test('returns correct mapping path', () => {
      const mappingPath = transientManager.getMappingPath();
      expect(mappingPath).toBe(mockMappingPath);
    });
  });

  describe('isTransientPath', () => {
    test('returns true for path inside transient base directory', () => {
      const filePath = path.join(mockBasePath, 'bruno-abc123', 'request.bru');
      expect(transientManager.isTransientPath(filePath)).toBe(true);
    });

    test('returns true for nested path inside transient directory', () => {
      const filePath = path.join(mockBasePath, 'bruno-abc123', 'subfolder', 'request.bru');
      expect(transientManager.isTransientPath(filePath)).toBe(true);
    });

    test('returns true for transient directory itself', () => {
      const filePath = path.join(mockBasePath, 'bruno-abc123');
      expect(transientManager.isTransientPath(filePath)).toBe(true);
    });

    test('returns false for regular collection path', () => {
      const filePath = '/Users/someone/collections/my-collection/request.bru';
      expect(transientManager.isTransientPath(filePath)).toBe(false);
    });

    test('returns false for falsy input', () => {
      expect(transientManager.isTransientPath(null)).toBe(false);
      expect(transientManager.isTransientPath(undefined)).toBe(false);
      expect(transientManager.isTransientPath('')).toBe(false);
    });

    test('returns false for path that partially matches but is not inside', () => {
      // Path starts with "/mock/userData/tmp/transient-" (hyphen) not "/mock/userData/tmp/transient/" (slash)
      // The isTransientPath method checks for basePath + path.sep, so this correctly returns false
      const filePath = path.join('/mock/userData/tmp/transient-other', 'request.bru');
      expect(transientManager.isTransientPath(filePath)).toBe(false);
    });

    test('handles paths with trailing separators', () => {
      const filePath = path.join(mockBasePath, 'bruno-abc123') + path.sep;
      expect(transientManager.isTransientPath(filePath)).toBe(true);
    });
  });

  describe('readMapping', () => {
    test('returns empty collections object when file does not exist', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        throw new Error('ENOENT: no such file or directory');
      });

      const result = transientManager.readMapping();
      expect(result).toEqual({ collections: {} });
    });

    test('returns empty collections object when file is corrupted', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return '{ invalid json }';
      });

      const result = transientManager.readMapping();
      expect(result).toEqual({ collections: {} });
    });
  });

  describe('writeMapping', () => {
    test('writes mapping to file with proper formatting', () => {
      const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const mapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-abc123',
            format: 'bru'
          }
        }
      };

      transientManager.writeMapping(mapping);

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        mockMappingPath,
        JSON.stringify(mapping, null, 2),
        'utf8'
      );
    });
  });

  describe('getOrCreateDirectory', () => {
    const mockTransientDir = '/mock/userData/tmp/transient/bruno-abc123';

    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      jest.spyOn(fs, 'mkdtempSync').mockReturnValue(mockTransientDir);
      jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, content, encoding) => {
        expect(filePath).toBe(mockMappingPath);
        expect(encoding).toBe('utf8');
      });
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        throw new Error('ENOENT');
      });
    });

    test('creates new directory when none exists for collection', () => {
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
      const mkdtempSpy = jest.spyOn(fs, 'mkdtempSync');

      const result = transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'bru');

      expect(result).toBe(mockTransientDir);
      // First call creates the base transient directory
      expect(mkdirSpy).toHaveBeenCalledWith(mockBasePath, { recursive: true });
      expect(mkdirSpy).toHaveBeenCalledTimes(1);
      // mkdtempSync creates the collection-specific transient directory
      expect(mkdtempSpy).toHaveBeenCalledWith(path.join(mockBasePath, 'bruno-'));
      expect(mkdtempSpy).toHaveBeenCalledTimes(1);
    });

    test('returns existing directory if already mapped and exists on disk', () => {
      const existingDir = '/mock/userData/tmp/transient/bruno-existing';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: existingDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => p === existingDir);

      const result = transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'bru');

      expect(result).toBe(existingDir);
    });

    test('creates new directory if mapped but directory was deleted from disk', () => {
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-deleted',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdtempSpy = jest.spyOn(fs, 'mkdtempSync');

      const result = transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'bru');

      // Should create a new directory, not return the deleted one
      expect(result).not.toBe('/mock/userData/tmp/transient/bruno-deleted');
      expect(result).toBe(mockTransientDir);
      expect(mkdtempSpy).toHaveBeenCalledWith(path.join(mockBasePath, 'bruno-'));
    });

    test('stores collection data correctly in mapping', () => {
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync');

      transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'yml');

      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-123']).toMatchObject({
        pathname: '/path/to/collection',
        format: 'yml',
        transientDir: expect.any(String)
      });
    });

    test('stores createdAt timestamp in mapping', () => {
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync');
      const beforeTime = Date.now();

      transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'bru');

      const afterTime = Date.now();
      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      const createdAt = writtenMapping.collections['uid-123'].createdAt;

      expect(createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(createdAt).toBeLessThanOrEqual(afterTime);
    });

    test('defaults to yml format when not specified', () => {
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync');

      transientManager.getOrCreateDirectory('uid-123', '/path/to/collection');

      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-123'].format).toBe('yml');
    });

    test('skips mkdirSync when base path already exists', () => {
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        // Base path exists, but collection transient dir doesn't
        return p === mockBasePath;
      });
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync');
      const mkdtempSpy = jest.spyOn(fs, 'mkdtempSync');

      transientManager.getOrCreateDirectory('uid-123', '/path/to/collection', 'yml');

      // Should NOT call mkdirSync since basePath exists
      expect(mkdirSpy).not.toHaveBeenCalled();
      // Should still call mkdtempSync
      expect(mkdtempSpy).toHaveBeenCalledWith(path.join(mockBasePath, 'bruno-'));
    });
  });

  describe('getDirectoryPath', () => {
    test('returns path for existing mapped collection', () => {
      const existingDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: existingDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify(mockMapping);
      });
      jest.spyOn(fs, 'existsSync').mockImplementation((dirPath) => {
        expect(dirPath).toBe(existingDir);
        return true;
      });

      const result = transientManager.getDirectoryPath('uid-123');
      expect(result).toBe(existingDir);
    });

    test('returns null for unmapped collection', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify({ collections: {} });
      });

      const result = transientManager.getDirectoryPath('uid-unknown');
      expect(result).toBeNull();
    });

    test('returns null if directory was deleted from disk', () => {
      const deletedDir = '/mock/userData/tmp/transient/bruno-deleted';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: deletedDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify(mockMapping);
      });
      jest.spyOn(fs, 'existsSync').mockImplementation((dirPath) => {
        expect(dirPath).toBe(deletedDir);
        return false;
      });

      const result = transientManager.getDirectoryPath('uid-123');
      expect(result).toBeNull();
    });
  });

  describe('getCollectionInfo', () => {
    test('returns correct info for mapped transient directory', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'yml'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result).toEqual({
        collectionUid: 'uid-123',
        collectionPath: '/path/to/collection',
        format: 'yml'
      });
    });

    test('defaults to yml format when not specified in mapping', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir
            // format not specified
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result.format).toBe('yml');
    });

    test('returns info for scratch collection with metadata.json', () => {
      const transientDir = '/mock/userData/tmp/transient/scratch-123';
      const mockMetadata = { type: 'scratch' };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.endsWith('transient-mapping.json')) {
          return JSON.stringify({ collections: {} });
        }
        if (filePath.endsWith('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        throw new Error('ENOENT');
      });

      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.endsWith('metadata.json');
      });

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result).toEqual({
        collectionUid: null,
        collectionPath: transientDir,
        format: 'yml'
      });
    });

    test('returns info for legacy metadata.json with collectionPath', () => {
      const transientDir = '/mock/userData/tmp/transient/legacy-123';
      const mockMetadata = { collectionPath: '/legacy/collection/path' };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.endsWith('transient-mapping.json')) {
          return JSON.stringify({ collections: {} });
        }
        if (filePath.endsWith('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        throw new Error('ENOENT');
      });

      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.endsWith('metadata.json');
      });

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result).toEqual({
        collectionUid: null,
        collectionPath: '/legacy/collection/path',
        format: 'bru'
      });
    });

    test('returns null for unknown directory', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.endsWith('transient-mapping.json')) {
          return JSON.stringify({ collections: {} });
        }
        throw new Error('ENOENT');
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = transientManager.getCollectionInfo('/unknown/directory');

      expect(result).toBeNull();
    });

    test('handles corrupted metadata.json gracefully', () => {
      const transientDir = '/mock/userData/tmp/transient/corrupted-123';

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.endsWith('transient-mapping.json')) {
          return JSON.stringify({ collections: {} });
        }
        if (filePath.endsWith('metadata.json')) {
          return '{ invalid json }';
        }
        throw new Error('ENOENT');
      });

      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.endsWith('metadata.json');
      });

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result).toBeNull();
    });

    test('finds correct mapping when multiple collections exist', () => {
      const targetDir = '/mock/userData/tmp/transient/bruno-target';
      const mockMapping = {
        collections: {
          'uid-first': {
            pathname: '/path/to/first',
            transientDir: '/mock/userData/tmp/transient/bruno-first',
            format: 'bru'
          },
          'uid-target': {
            pathname: '/path/to/target',
            transientDir: targetDir,
            format: 'yml'
          },
          'uid-third': {
            pathname: '/path/to/third',
            transientDir: '/mock/userData/tmp/transient/bruno-third',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));

      const result = transientManager.getCollectionInfo(targetDir);

      expect(result).toEqual({
        collectionUid: 'uid-target',
        collectionPath: '/path/to/target',
        format: 'yml'
      });
    });

    test('returns null for metadata.json without type:scratch or collectionPath', () => {
      const transientDir = '/mock/userData/tmp/transient/unknown-123';
      const mockMetadata = { someOtherField: 'value' };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        if (filePath.endsWith('transient-mapping.json')) {
          return JSON.stringify({ collections: {} });
        }
        if (filePath.endsWith('metadata.json')) {
          return JSON.stringify(mockMetadata);
        }
        throw new Error('ENOENT');
      });

      jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
        return filePath.endsWith('metadata.json');
      });

      const result = transientManager.getCollectionInfo(transientDir);

      expect(result).toBeNull();
    });
  });

  describe('deleteDirectory', () => {
    test('removes directory from disk and mapping', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify(mockMapping);
      });
      jest.spyOn(fs, 'existsSync').mockImplementation((dirPath) => {
        expect(dirPath).toBe(transientDir);
        return true;
      });
      const rmSyncSpy = jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
      });

      const result = transientManager.deleteDirectory('uid-123');

      expect(result).toBe(true);
      expect(rmSyncSpy).toHaveBeenCalledWith(transientDir, { recursive: true, force: true });

      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-123']).toBeUndefined();
    });

    test('returns false for non-existent collection', () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify({ collections: {} });
      });

      const result = transientManager.deleteDirectory('uid-unknown');

      expect(result).toBe(false);
    });

    test('handles already-deleted directory gracefully', () => {
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-deleted',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = transientManager.deleteDirectory('uid-123');

      expect(result).toBe(true);
      // Should still remove from mapping
      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-123']).toBeUndefined();
    });

    test('returns false when rmSync throws error', () => {
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-abc123',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'rmSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = transientManager.deleteDirectory('uid-123');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('deleteDirectoryByPath', () => {
    test('deletes directory when path matches', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = transientManager.deleteDirectoryByPath('/path/to/collection');

      expect(result).toBe(true);
    });

    test('returns false when path not found', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ collections: {} }));

      const result = transientManager.deleteDirectoryByPath('/unknown/path');

      expect(result).toBe(false);
    });
  });

  describe('cleanupOrphanedDirectories', () => {
    test('removes mappings where collection path no longer exists', () => {
      const mockMapping = {
        collections: {
          'uid-valid': {
            pathname: '/path/to/valid/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-valid',
            format: 'bru'
          },
          'uid-orphan': {
            pathname: '/path/to/deleted/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-orphan',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (p === '/path/to/valid/collection') return true;
        if (p === '/path/to/deleted/collection') return false;
        if (p === '/mock/userData/tmp/transient/bruno-orphan') return true;
        return false;
      });

      const rmSyncSpy = jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = transientManager.cleanupOrphanedDirectories();

      expect(result).toBe(1);
      expect(rmSyncSpy).toHaveBeenCalledWith(
        '/mock/userData/tmp/transient/bruno-orphan',
        { recursive: true, force: true }
      );

      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-valid']).toBeDefined();
      expect(writtenMapping.collections['uid-orphan']).toBeUndefined();
    });

    test('preserves valid mappings', () => {
      const mockMapping = {
        collections: {
          'uid-valid': {
            pathname: '/path/to/valid/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-valid',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const result = transientManager.cleanupOrphanedDirectories();

      expect(result).toBe(0);
      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    test('handles rmSync errors gracefully and continues', () => {
      const mockMapping = {
        collections: {
          'uid-orphan-1': {
            pathname: '/path/to/deleted/1',
            transientDir: '/mock/userData/tmp/transient/bruno-orphan-1',
            format: 'bru'
          },
          'uid-orphan-2': {
            pathname: '/path/to/deleted/2',
            transientDir: '/mock/userData/tmp/transient/bruno-orphan-2',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockImplementation((p) => {
        return p.startsWith('/mock/userData/tmp/transient/');
      });

      let callCount = 0;
      jest.spyOn(fs, 'rmSync').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Permission denied');
        }
      });

      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = transientManager.cleanupOrphanedDirectories();

      // Only one should be cleaned (the second one)
      expect(result).toBe(1);
    });

    test('skips rmSync when transient directory already deleted from disk', () => {
      const mockMapping = {
        collections: {
          'uid-orphan': {
            pathname: '/path/to/deleted/collection',
            transientDir: '/mock/userData/tmp/transient/bruno-already-gone',
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(false); // Both collection and transient dir don't exist
      const rmSyncSpy = jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
      const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = transientManager.cleanupOrphanedDirectories();

      expect(result).toBe(1);
      // rmSync should NOT be called since the transient directory doesn't exist
      expect(rmSyncSpy).not.toHaveBeenCalled();
      // But mapping should still be updated
      const writtenMapping = JSON.parse(writeFileSpy.mock.calls[0][1]);
      expect(writtenMapping.collections['uid-orphan']).toBeUndefined();
    });
  });

  describe('listFiles', () => {
    test('returns all .bru files for bru format collection', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        expect(filePath).toBe(mockMappingPath);
        return JSON.stringify(mockMapping);
      });
      jest.spyOn(fs, 'existsSync').mockImplementation((dirPath) => {
        expect(dirPath).toBe(transientDir);
        return true;
      });
      jest.spyOn(fs, 'readdirSync').mockImplementation((dirPath, options) => {
        expect(dirPath).toBe(transientDir);
        expect(options).toEqual({ withFileTypes: true });
        return [
          { name: 'request1.bru', isFile: () => true },
          { name: 'request2.bru', isFile: () => true },
          { name: 'subfolder', isFile: () => false }
        ];
      });

      const result = transientManager.listFiles('uid-123');

      expect(result).toEqual([
        path.join(transientDir, 'request1.bru'),
        path.join(transientDir, 'request2.bru')
      ]);
    });

    test('returns all .yml files for yml format collection', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'yml'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'request1.yml', isFile: () => true },
        { name: 'request2.yml', isFile: () => true }
      ]);

      const result = transientManager.listFiles('uid-123');

      expect(result).toEqual([
        path.join(transientDir, 'request1.yml'),
        path.join(transientDir, 'request2.yml')
      ]);
    });

    test('excludes folder.bru and folder.yml', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'request.bru', isFile: () => true },
        { name: 'folder.bru', isFile: () => true },
        { name: 'folder.yml', isFile: () => true }
      ]);

      const result = transientManager.listFiles('uid-123');

      expect(result).toEqual([
        path.join(transientDir, 'request.bru')
      ]);
    });

    test('returns empty array for unmapped collection', () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ collections: {} }));

      const result = transientManager.listFiles('uid-unknown');

      expect(result).toEqual([]);
    });

    test('handles readdirSync errors gracefully', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru'
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = transientManager.listFiles('uid-123');

      expect(result).toEqual([]);
    });

    test('uses provided format parameter over mapping format', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir,
            format: 'bru' // mapping says bru
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'request.yml', isFile: () => true },
        { name: 'request.bru', isFile: () => true }
      ]);

      // Pass yml as format parameter
      const result = transientManager.listFiles('uid-123', 'yml');

      expect(result).toEqual([
        path.join(transientDir, 'request.yml')
      ]);
    });

    test('defaults to yml format when mapping has no format field', () => {
      const transientDir = '/mock/userData/tmp/transient/bruno-abc123';
      const mockMapping = {
        collections: {
          'uid-123': {
            pathname: '/path/to/collection',
            transientDir: transientDir
            // no format field
          }
        }
      };

      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockMapping));
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockReturnValue([
        { name: 'request.yml', isFile: () => true },
        { name: 'request.bru', isFile: () => true }
      ]);

      // No format parameter - should default to yml
      const result = transientManager.listFiles('uid-123');

      expect(result).toEqual([
        path.join(transientDir, 'request.yml')
      ]);
    });
  });
});
