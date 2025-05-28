const fs = require('fs-extra');
const path = require('path');
const { dir: getTmpDir } = require('tmp-promise');
const createCollection = require('../src/commands/create-collection');

describe('create-collection command', () => {
  let tmpDir;
  let originalCwd;
  let mockExit;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();
    // Create temporary directory for tests
    tmpDir = await getTmpDir({ unsafeCleanup: true });
    // Change to temporary directory
    process.chdir(tmpDir.path);
    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(async () => {
    // Restore original working directory
    process.chdir(originalCwd);
    // Cleanup temporary directory
    await tmpDir.cleanup();
    // Restore process.exit
    mockExit.mockRestore();
  });

  describe('sanitizeName', () => {
    it('should accept valid collection names', () => {
      const validNames = [
        'my-api',
        'test_api',
        'api123',
        'myApi',
        'my-cool-api-123'
      ];

      validNames.forEach(name => {
        expect(() => createCollection.sanitizeName(name)).not.toThrow();
      });
    });

    it('should reject invalid collection names', () => {
      const invalidNames = [
        '../my-api',
        'my/api',
        'my\\api',
        'my api',
        'my$api',
        'my@api',
        '/my-api',
        'C:\\my-api'
      ];

      invalidNames.forEach(name => {
        expect(() => createCollection.sanitizeName(name))
          .toThrow('Collection name can only contain letters, numbers, hyphens, and underscores');
      });
    });
  });

  describe('handler', () => {
    it('should create collection with default name', async () => {
      await createCollection.handler({ name: 'my-bruno-collection' });

      // Check if directory was created
      expect(fs.existsSync('my-bruno-collection')).toBe(true);

      // Check if essential files exist
      const files = [
        'bruno.json',
        'README.md',
        'environments/development.bru',
        'environments/production.bru'
      ];

      files.forEach(file => {
        expect(fs.existsSync(path.join('my-bruno-collection', file))).toBe(true);
      });
    });

    it('should create collection with custom name', async () => {
      await createCollection.handler({ name: 'test-api' });

      expect(fs.existsSync('test-api')).toBe(true);
      expect(fs.existsSync(path.join('test-api', 'bruno.json'))).toBe(true);

      // Verify collection name in bruno.json
      const brunoJson = fs.readJsonSync(path.join('test-api', 'bruno.json'));
      expect(brunoJson.name).toBe('Test Api');
    });

    it('should fail if directory exists and force is false', async () => {
      // Create directory first
      fs.mkdirSync('existing-api');

      // Expect process.exit to be called
      await expect(createCollection.handler({
        name: 'existing-api',
        force: false
      })).rejects.toThrow('process.exit called');

      // Verify process.exit was called with code 1
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should overwrite if directory exists and force is true', async () => {
      // Create directory with some content
      const existingDir = 'existing-api';
      fs.mkdirSync(existingDir);
      fs.writeFileSync(path.join(existingDir, 'old-file.txt'), 'old content');

      await createCollection.handler({
        name: existingDir,
        force: true
      });

      // Check if old content is gone and new structure is in place
      expect(fs.existsSync(path.join(existingDir, 'old-file.txt'))).toBe(false);
      expect(fs.existsSync(path.join(existingDir, 'bruno.json'))).toBe(true);
    });

    it('should create proper environment files', async () => {
      await createCollection.handler({ name: 'env-test' });

      const devEnv = fs.readFileSync(
        path.join('env-test', 'environments', 'development.bru'),
        'utf8'
      );
      const prodEnv = fs.readFileSync(
        path.join('env-test', 'environments', 'production.bru'),
        'utf8'
      );

      // Match environment variable blocks
      const varsBlockRegex = /^vars\s*{[\s\S]*?}$/m;

      expect(devEnv).toMatch(varsBlockRegex);
      expect(prodEnv).toMatch(varsBlockRegex);
    });

    it('should handle file system errors gracefully', async () => {
      // Mock fs.existsSync to throw an error
      const mockExistsSync = jest.spyOn(fs, 'existsSync').mockImplementation(() => {
        throw new Error('File system error');
      });

      await expect(createCollection.handler({
        name: 'test-api'
      })).rejects.toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExistsSync.mockRestore();
    });
  });
});