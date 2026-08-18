jest.mock('electron', () => ({
  dialog: { showOpenDialog: jest.fn(), showSaveDialog: jest.fn() },
  app: { getPath: jest.fn(() => '/tmp') }
}));

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  detectCollectionLayout,
  getCollectionFormat,
  isValidCollectionDirectory,
  hasRequestExtension,
  searchForRequestFiles,
  resolveYamlPath,
  isEnvironmentConfigFile,
  isCollectionRootFile,
  scanForBrunoFiles
} = require('../../src/utils/filesystem');
const { defaultClassify } = require('../../src/utils/mount');

// A collection may be laid out as `.bru`, `.yml` or `.yaml`. Detection has to name the layout
// (which drives every filename the app writes) rather than just the serializer, and `.yaml` must
// be a first-class layout everywhere `.yml` is.

describe('collection layout detection', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-layout-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const seedRoot = (basename, content = 'opencollection: "1.0.0"\ninfo:\n  name: c\n') => {
    fs.writeFileSync(path.join(dir, basename), content);
  };

  describe('detectCollectionLayout', () => {
    it('detects a .yml collection', () => {
      seedRoot('opencollection.yml');
      expect(detectCollectionLayout(dir)).toBe('yml');
    });

    it('detects a .yaml collection', () => {
      seedRoot('opencollection.yaml');
      expect(detectCollectionLayout(dir)).toBe('yaml');
    });

    it('detects a bru collection via bruno.json', () => {
      fs.writeFileSync(path.join(dir, 'bruno.json'), '{"version":"1","name":"c","type":"collection"}');
      expect(detectCollectionLayout(dir)).toBe('bru');
    });

    it('prefers .yml over .yaml when both roots exist', () => {
      seedRoot('opencollection.yml');
      seedRoot('opencollection.yaml');
      expect(detectCollectionLayout(dir)).toBe('yml');
    });

    it('prefers an OpenCollection root over a leftover bruno.json', () => {
      // A migrated collection can keep a stale bruno.json; the new root wins.
      seedRoot('opencollection.yaml');
      fs.writeFileSync(path.join(dir, 'bruno.json'), '{"version":"1","name":"c","type":"collection"}');
      expect(detectCollectionLayout(dir)).toBe('yaml');
    });

    it('returns null when the directory is not a collection', () => {
      expect(detectCollectionLayout(dir)).toBe(null);
      expect(detectCollectionLayout('')).toBe(null);
    });
  });

  describe('getCollectionFormat', () => {
    it('returns the layout key, not just the serializer', () => {
      seedRoot('opencollection.yaml');
      expect(getCollectionFormat(dir)).toBe('yaml');
    });

    it('throws when there is no collection config', () => {
      expect(() => getCollectionFormat(dir)).toThrow('No collection configuration found');
    });
  });

  describe('isValidCollectionDirectory', () => {
    it('accepts a .yaml collection', () => {
      seedRoot('opencollection.yaml');
      expect(isValidCollectionDirectory(dir)).toBe(true);
    });

    it('rejects a plain directory', () => {
      expect(isValidCollectionDirectory(dir)).toBe(false);
    });
  });

  describe('resolveYamlPath', () => {
    it('resolves either extension, preferring .yml', () => {
      fs.writeFileSync(path.join(dir, 'workspace.yaml'), '');
      expect(resolveYamlPath(dir, 'workspace')).toBe(path.join(dir, 'workspace.yaml'));

      fs.writeFileSync(path.join(dir, 'workspace.yml'), '');
      expect(resolveYamlPath(dir, 'workspace')).toBe(path.join(dir, 'workspace.yml'));
    });

    it('returns null when neither exists', () => {
      expect(resolveYamlPath(dir, 'workspace')).toBe(null);
    });
  });

  describe('hasRequestExtension', () => {
    it('accepts every layout extension when no layout is given', () => {
      expect(hasRequestExtension('a.bru')).toBe(true);
      expect(hasRequestExtension('a.yml')).toBe(true);
      expect(hasRequestExtension('a.yaml')).toBe(true);
      expect(hasRequestExtension('a.json')).toBe(false);
    });

    it('pins the extension when a layout is given', () => {
      expect(hasRequestExtension('a.yaml', 'yaml')).toBe(true);
      expect(hasRequestExtension('a.yml', 'yaml')).toBe(false);
      expect(hasRequestExtension('a.yaml', 'yml')).toBe(false);
      expect(hasRequestExtension('a.bru', 'bru')).toBe(true);
    });

    it('throws rather than silently assuming .bru for an unknown layout', () => {
      // Every caller passes a layout from getCollectionFormat, so an unknown one is a caller
      // bug; treating it as .bru would hide it and mis-classify a .yaml collection's files.
      expect(() => hasRequestExtension('a.yaml', 'toml')).toThrow();
    });
  });

  describe('searchForRequestFiles', () => {
    it('finds .yaml requests in a .yaml collection and ignores .yml strays', () => {
      seedRoot('opencollection.yaml');
      fs.writeFileSync(path.join(dir, 'get-users.yaml'), 'info:\n  name: Get Users\n');
      fs.writeFileSync(path.join(dir, 'stray.yml'), 'info:\n  name: Stray\n');

      const found = searchForRequestFiles(dir).map((p) => path.basename(p));
      expect(found).toContain('get-users.yaml');
      expect(found).not.toContain('stray.yml');
    });
  });

  describe('isEnvironmentConfigFile', () => {
    it('accepts an environment under any layout extension', () => {
      const envDir = path.join(dir, 'environments');
      expect(isEnvironmentConfigFile(path.join(envDir, 'dev.yaml'), dir)).toBe(true);
      expect(isEnvironmentConfigFile(path.join(envDir, 'dev.yml'), dir)).toBe(true);
      expect(isEnvironmentConfigFile(path.join(envDir, 'dev.bru'), dir)).toBe(true);
    });

    it('rejects files outside the environments directory', () => {
      expect(isEnvironmentConfigFile(path.join(dir, 'dev.yaml'), dir)).toBe(false);
    });
  });

  describe('isCollectionRootFile', () => {
    it('accepts every layout root at the collection root, including the legacy name', () => {
      expect(isCollectionRootFile(path.join(dir, 'opencollection.yaml'), dir)).toBe(true);
      expect(isCollectionRootFile(path.join(dir, 'opencollection.yml'), dir)).toBe(true);
      expect(isCollectionRootFile(path.join(dir, 'collection.bru'), dir)).toBe(true);
      expect(isCollectionRootFile(path.join(dir, 'collection.yml'), dir)).toBe(true);
    });

    it('rejects a request file and a nested root', () => {
      expect(isCollectionRootFile(path.join(dir, 'get-users.yaml'), dir)).toBe(false);
      expect(isCollectionRootFile(path.join(dir, 'sub', 'opencollection.yaml'), dir)).toBe(false);
    });
  });

  describe('scanForBrunoFiles', () => {
    it('discovers a nested .yaml collection', async () => {
      const nested = path.join(dir, 'nested');
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(nested, 'opencollection.yaml'), 'opencollection: "1.0.0"\n');

      const found = await scanForBrunoFiles(dir);
      expect(found).toEqual([nested]);
    });
  });
});

describe('mount classifier', () => {
  it('classifies .yaml files by type, mapping them to the yaml layout', () => {
    expect(defaultClassify('opencollection.yaml')).toEqual({ format: 'yaml', type: 'collection' });
    expect(defaultClassify(path.join('users', 'folder.yaml'))).toEqual({ format: 'yaml', type: 'folder' });
    expect(defaultClassify(path.join('environments', 'dev.yaml'))).toEqual({ format: 'yaml', type: 'environment' });
    expect(defaultClassify(path.join('users', 'get-users.yaml'))).toEqual({ format: 'yaml', type: 'request' });
  });

  it('still classifies .yml and .bru files', () => {
    expect(defaultClassify('opencollection.yml')).toEqual({ format: 'yml', type: 'collection' });
    expect(defaultClassify('collection.bru')).toEqual({ format: 'bru', type: 'collection' });
    expect(defaultClassify('bruno.json')).toEqual({ format: 'json', type: 'config' });
  });

  it('accepts the legacy collection.yml root name', () => {
    expect(defaultClassify('collection.yml')).toEqual({ format: 'yml', type: 'collection' });
  });

  it('ignores files that belong to no layout', () => {
    expect(defaultClassify('README.md')).toBe(null);
  });
});
