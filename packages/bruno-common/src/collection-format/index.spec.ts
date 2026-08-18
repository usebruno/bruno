import {
  COLLECTION_LAYOUTS,
  COLLECTION_LAYOUT_ORDER,
  COLLECTION_ROOT_BASENAMES,
  FOLDER_ROOT_BASENAMES,
  READABLE_COLLECTION_ROOT_BASENAMES,
  YAML_EXTENSIONS,
  getLayoutConfig,
  getLayoutForFilename,
  isCollectionMarkerBasename,
  isCollectionRootBasename,
  isFolderRootBasename,
  isOpenCollectionLayout,
  isRequestFilename,
  isYamlFilename,
  stripRequestExtension,
  stripYamlExtension
} from './index';

describe('COLLECTION_LAYOUTS', () => {
  it('describes every layout', () => {
    expect(COLLECTION_LAYOUTS).toEqual({
      yml: {
        ext: '.yml',
        collectionFile: 'opencollection.yml',
        folderFile: 'folder.yml',
        marker: 'opencollection.yml',
        legacyCollectionFiles: ['collection.yml']
      },
      yaml: {
        ext: '.yaml',
        collectionFile: 'opencollection.yaml',
        folderFile: 'folder.yaml',
        marker: 'opencollection.yaml',
        legacyCollectionFiles: []
      },
      bru: {
        ext: '.bru',
        collectionFile: 'collection.bru',
        folderFile: 'folder.bru',
        marker: 'bruno.json',
        legacyCollectionFiles: []
      }
    });
  });

  it('detects a bru collection by bruno.json, not by the optional collection.bru', () => {
    expect(COLLECTION_LAYOUTS.bru.marker).toBe('bruno.json');
    for (const layout of ['yml', 'yaml'] as const) {
      expect(COLLECTION_LAYOUTS[layout].marker).toBe(COLLECTION_LAYOUTS[layout].collectionFile);
    }
  });

  it('covers every layout in the detection order, with .yml winning over .yaml', () => {
    expect(COLLECTION_LAYOUT_ORDER).toEqual(['yml', 'yaml', 'bru']);
    expect(COLLECTION_LAYOUT_ORDER.slice().sort()).toEqual(Object.keys(COLLECTION_LAYOUTS).sort());
  });

  it('derives every basename list and extension list from the layout table', () => {
    expect(YAML_EXTENSIONS).toEqual(['.yml', '.yaml']);
    expect(COLLECTION_ROOT_BASENAMES).toEqual(['opencollection.yml', 'opencollection.yaml', 'collection.bru']);
    expect(FOLDER_ROOT_BASENAMES).toEqual(['folder.yml', 'folder.yaml', 'folder.bru']);
  });

  it('separates roots Bruno writes from roots it merely reads', () => {
    // Legacy names must be recognized but never written, so the two lists differ by exactly them.
    expect(READABLE_COLLECTION_ROOT_BASENAMES).toEqual([
      'opencollection.yml',
      'collection.yml',
      'opencollection.yaml',
      'collection.bru'
    ]);
    expect(COLLECTION_ROOT_BASENAMES).not.toContain('collection.yml');
  });
});

describe('getLayoutConfig', () => {
  it('returns the config for a known layout', () => {
    expect(getLayoutConfig('yaml').ext).toBe('.yaml');
  });

  it('falls back to bru by default and to an explicit layout when given', () => {
    expect(getLayoutConfig(undefined).ext).toBe('.bru');
    expect(getLayoutConfig(null, 'yml').ext).toBe('.yml');
    expect(getLayoutConfig('nonsense', 'yml').collectionFile).toBe('opencollection.yml');
  });
});

describe('isOpenCollectionLayout', () => {
  it('accepts both YAML layouts', () => {
    expect(isOpenCollectionLayout('yml')).toBe(true);
    expect(isOpenCollectionLayout('yaml')).toBe(true);
  });

  it('rejects bru and empty values', () => {
    expect(isOpenCollectionLayout('bru')).toBe(false);
    expect(isOpenCollectionLayout(null)).toBe(false);
    expect(isOpenCollectionLayout(undefined)).toBe(false);
  });
});

describe('isYamlFilename', () => {
  it('accepts both extensions, case-insensitively', () => {
    expect(isYamlFilename('dev.yml')).toBe(true);
    expect(isYamlFilename('dev.yaml')).toBe(true);
    expect(isYamlFilename('DEV.YAML')).toBe(true);
    expect(isYamlFilename('/abs/path/opencollection.yaml')).toBe(true);
  });

  it('rejects other extensions and near-misses', () => {
    expect(isYamlFilename('req.bru')).toBe(false);
    expect(isYamlFilename('notes.yml.bak')).toBe(false);
    expect(isYamlFilename('yaml')).toBe(false);
    expect(isYamlFilename('')).toBe(false);
    expect(isYamlFilename(null)).toBe(false);
  });
});

describe('isRequestFilename', () => {
  it('accepts every layout extension', () => {
    expect(isRequestFilename('a.bru')).toBe(true);
    expect(isRequestFilename('a.yml')).toBe(true);
    expect(isRequestFilename('a.yaml')).toBe(true);
    expect(isRequestFilename('A.YAML')).toBe(true);
  });

  it('rejects unrelated files', () => {
    expect(isRequestFilename('bruno.json')).toBe(false);
    expect(isRequestFilename('README.md')).toBe(false);
  });
});

describe('stripYamlExtension / stripRequestExtension', () => {
  it('drops only a trailing extension it recognizes', () => {
    expect(stripYamlExtension('dev.yml')).toBe('dev');
    expect(stripYamlExtension('dev.yaml')).toBe('dev');
    expect(stripYamlExtension('DEV.YAML')).toBe('DEV');
    expect(stripRequestExtension('get-users.bru')).toBe('get-users');
    expect(stripRequestExtension('get-users.yaml')).toBe('get-users');
  });

  it('leaves an unrecognized extension alone rather than truncating it', () => {
    // A generic "strip any extension" would mangle these.
    expect(stripYamlExtension('api.v1.json')).toBe('api.v1.json');
    expect(stripYamlExtension('my.request.bru')).toBe('my.request.bru');
    expect(stripRequestExtension('notes.md')).toBe('notes.md');
    expect(stripRequestExtension('no-extension')).toBe('no-extension');
  });

  it('keeps inner dots when stripping', () => {
    expect(stripRequestExtension('my.request.v2.yaml')).toBe('my.request.v2');
  });
});

describe('getLayoutForFilename', () => {
  it('maps each extension to its layout', () => {
    expect(getLayoutForFilename('a.bru')).toBe('bru');
    expect(getLayoutForFilename('a.yml')).toBe('yml');
    expect(getLayoutForFilename('a.yaml')).toBe('yaml');
    expect(getLayoutForFilename('A.YAML')).toBe('yaml');
  });

  it('returns null for anything else', () => {
    expect(getLayoutForFilename('bruno.json')).toBe(null);
    expect(getLayoutForFilename('')).toBe(null);
    expect(getLayoutForFilename(undefined)).toBe(null);
  });
});

describe('basename predicates', () => {
  it('accepts every collection root plus the legacy name', () => {
    expect(isCollectionRootBasename('opencollection.yml')).toBe(true);
    expect(isCollectionRootBasename('opencollection.yaml')).toBe(true);
    expect(isCollectionRootBasename('collection.bru')).toBe(true);
    expect(isCollectionRootBasename('collection.yml')).toBe(true);
  });

  it('rejects a request file and the bru config as a collection root', () => {
    expect(isCollectionRootBasename('get-users.yaml')).toBe(false);
    expect(isCollectionRootBasename('bruno.json')).toBe(false);
  });

  it('identifies folder roots', () => {
    expect(isFolderRootBasename('folder.yml')).toBe(true);
    expect(isFolderRootBasename('folder.yaml')).toBe(true);
    expect(isFolderRootBasename('folder.bru')).toBe(true);
    expect(isFolderRootBasename('folders.yml')).toBe(false);
  });

  it('identifies the collection marker, which for bru is bruno.json not collection.bru', () => {
    expect(isCollectionMarkerBasename('bruno.json')).toBe(true);
    expect(isCollectionMarkerBasename('opencollection.yaml')).toBe(true);
    // `collection.bru` is a root file but not the marker — a stray one is not a collection.
    expect(isCollectionMarkerBasename('collection.bru')).toBe(false);
  });

  it('matches case-insensitively, since Windows and macOS filesystems are', () => {
    // `OpenCollection.YML` is the same file as `opencollection.yml` on those platforms; comparing
    // exact-case would let it fall through and be classified as an ordinary request.
    expect(isCollectionRootBasename('OpenCollection.YML')).toBe(true);
    expect(isFolderRootBasename('Folder.Yml')).toBe(true);
    expect(isCollectionMarkerBasename('Bruno.JSON')).toBe(true);
  });
});
