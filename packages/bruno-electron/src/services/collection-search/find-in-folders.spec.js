const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

jest.mock('./mount-points', () => ({ getSkippedMountPoints: jest.fn() }));

const { getSkippedMountPoints } = require('./mount-points');
const { findCollectionsInFolders } = require('./find-in-folders');

const folderLinkType = process.platform === 'win32' ? 'junction' : 'dir';
const canRemoveReadAccess = process.platform !== 'win32' && process.getuid() !== 0;
const canMakePipes = process.platform !== 'win32';

describe('findCollectionsInFolders', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-search-')));
    getSkippedMountPoints.mockResolvedValue(new Set());
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  const makeFolder = (...segments) => {
    const folderPath = path.join(tempDir, ...segments);
    fs.mkdirSync(folderPath, { recursive: true });
    return folderPath;
  };

  const makeBruCollection = (name, ...segments) => {
    const folderPath = makeFolder(...segments);
    fs.writeFileSync(path.join(folderPath, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
    return folderPath;
  };

  const makeYmlCollection = (name, ...segments) => {
    const folderPath = makeFolder(...segments);
    fs.writeFileSync(path.join(folderPath, 'opencollection.yml'), `opencollection: 1.0.0\ninfo:\n  name: ${name}\n`);
    return folderPath;
  };

  const makeBrokenCollection = (...segments) => {
    const folderPath = makeFolder(...segments);
    fs.writeFileSync(path.join(folderPath, 'bruno.json'), '{ not json');
    return folderPath;
  };

  const folderSummary = (folderPath, status, collectionPaths = [], importableFiles = []) => ({
    path: folderPath,
    status,
    collectionPaths,
    importableFiles
  });

  it('reports a picked collection with the name from its config', async () => {
    const bru = makeBruCollection('Payments', 'payments');
    const yml = makeYmlCollection('Orders', 'orders');

    const result = await findCollectionsInFolders([bru, yml]);

    expect(result.folders).toEqual([
      folderSummary(bru, 'collection', [bru]),
      folderSummary(yml, 'collection', [yml])
    ]);
    expect(result.collections).toEqual([
      { path: bru, name: 'Payments' },
      { path: yml, name: 'Orders' }
    ]);
    expect(result.stoppedEarly).toBe(false);
  });

  it('reports a plain folder with the collections inside it', async () => {
    const workspace = makeFolder('workspace');
    const first = makeBruCollection('First', 'workspace', 'collections', 'first');
    const second = makeYmlCollection('Second', 'workspace', 'second');
    makeBruCollection('Nested', 'workspace', 'second', 'nested');

    const result = await findCollectionsInFolders([workspace]);

    expect(result.folders).toEqual([folderSummary(workspace, 'folder', expect.arrayContaining([first, second]))]);
    expect(result.folders[0].collectionPaths).toHaveLength(2);
    expect(result.collections).toHaveLength(2);
  });

  it('leaves out collections in hidden, dependency and build folders', async () => {
    const workspace = makeFolder('workspace');
    makeBruCollection('Fixture', 'workspace', 'node_modules', 'package', 'fixture');
    makeBruCollection('Hidden', 'workspace', '.cache', 'hidden');
    makeBruCollection('Built', 'workspace', 'dist', 'built');
    const kept = makeBruCollection('Kept', 'workspace', 'kept');

    const result = await findCollectionsInFolders([workspace]);

    expect(result.collections).toEqual([{ path: kept, name: 'Kept' }]);
  });

  it('does not follow links out of the picked folder', async () => {
    const outside = makeBruCollection('Payments', 'code', 'payments');
    const picked = makeFolder('api-collections');
    fs.symlinkSync(outside, path.join(picked, 'payments'), folderLinkType);

    const result = await findCollectionsInFolders([picked]);

    expect(result.folders).toEqual([folderSummary(picked, 'folder')]);
    expect(result.collections).toEqual([]);
  });

  it('skips mounted network and removable drives inside the picked folder', async () => {
    const volumes = makeFolder('volumes');
    const share = makeFolder('volumes', 'share');
    makeBruCollection('Remote', 'volumes', 'share', 'remote');
    const local = makeBruCollection('Local', 'volumes', 'local');
    getSkippedMountPoints.mockResolvedValue(new Set([share]));

    const result = await findCollectionsInFolders([volumes]);

    expect(result.collections).toEqual([{ path: local, name: 'Local' }]);
  });

  it('skips collections whose config cannot be opened and reports them', async () => {
    const workspace = makeFolder('workspace');
    const broken = makeBrokenCollection('workspace', 'broken');
    const valid = makeBruCollection('Valid', 'workspace', 'valid');

    const result = await findCollectionsInFolders([workspace, broken]);

    expect(result.folders).toEqual([
      folderSummary(workspace, 'folder', [valid]),
      folderSummary(broken, 'broken-collection')
    ]);
    expect(result.collections).toEqual([{ path: valid, name: 'Valid' }]);
    expect(result.brokenCollectionPaths).toEqual([broken]);
  });

  it('reports a picked collection whose config has no name as one that cannot be opened', async () => {
    const folderPath = makeFolder('nameless');
    fs.writeFileSync(path.join(folderPath, 'bruno.json'), JSON.stringify({ version: '1', type: 'collection' }));

    const result = await findCollectionsInFolders([folderPath]);

    expect(result.folders).toEqual([folderSummary(folderPath, 'broken-collection')]);
    expect(result.collections).toEqual([]);
    expect(result.brokenCollectionPaths).toEqual([folderPath]);
  });

  (canMakePipes ? it : it.skip)('does not wait on a named pipe or a link to one in place of a config file', async () => {
    const pipeFolder = makeFolder('pipe');
    execFileSync('mkfifo', [path.join(pipeFolder, 'bruno.json')]);
    const linkFolder = makeFolder('link');
    fs.symlinkSync(path.join(pipeFolder, 'bruno.json'), path.join(linkFolder, 'bruno.json'));

    const result = await findCollectionsInFolders([pipeFolder, linkFolder]);

    expect(result.folders).toEqual([folderSummary(pipeFolder, 'folder'), folderSummary(linkFolder, 'broken-collection')]);
    expect(result.brokenCollectionPaths).toEqual([linkFolder]);
  });

  it('does not look for importable files in a folder whose only collection cannot be opened', async () => {
    const folderPath = makeFolder('exports');
    makeBrokenCollection('exports', 'broken');
    fs.writeFileSync(path.join(folderPath, 'Orders.postman_collection.json'), '{}');

    const result = await findCollectionsInFolders([folderPath]);

    expect(result.folders).toEqual([folderSummary(folderPath, 'folder')]);
  });

  it('reports the importable files of a folder without collections', async () => {
    const exports = makeFolder('exports');
    fs.writeFileSync(path.join(exports, 'Orders.postman_collection.json'), '{}');
    fs.writeFileSync(path.join(exports, 'readme.md'), '# Orders');

    const result = await findCollectionsInFolders([exports]);

    expect(result.folders).toEqual([
      folderSummary(exports, 'folder', [], [
        { name: 'Orders.postman_collection.json', format: 'postman' }
      ])
    ]);
  });

  it('does not look for importable files when several folders are picked', async () => {
    const exports = makeFolder('exports');
    fs.writeFileSync(path.join(exports, 'openapi.yaml'), 'openapi: 3.0.0\n');
    const other = makeFolder('other');

    const result = await findCollectionsInFolders([exports, other]);

    expect(result.folders).toEqual([folderSummary(exports, 'folder'), folderSummary(other, 'folder')]);
  });

  it('does not look for importable files in a folder that has collections', async () => {
    const workspace = makeFolder('workspace');
    fs.writeFileSync(path.join(workspace, 'openapi.yaml'), 'openapi: 3.0.0\n');
    const collection = makeBruCollection('Api', 'workspace', 'api');

    const result = await findCollectionsInFolders([workspace]);

    expect(result.folders).toEqual([folderSummary(workspace, 'folder', [collection])]);
  });

  it('reports missing paths and files as problems', async () => {
    const missing = path.join(tempDir, 'missing');
    const file = path.join(tempDir, 'notes.txt');
    fs.writeFileSync(file, 'notes');

    const result = await findCollectionsInFolders([missing, file]);

    expect(result.folders).toEqual([folderSummary(missing, 'not-found'), folderSummary(file, 'not-a-folder')]);
  });

  (canRemoveReadAccess ? it : it.skip)('reports a picked folder it cannot read as no-access', async () => {
    const locked = makeFolder('locked');
    fs.chmodSync(locked, 0o000);

    try {
      const result = await findCollectionsInFolders([locked]);

      expect(result.folders).toEqual([folderSummary(locked, 'no-access')]);
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  });

  it('lists each collection once when picked folders overlap', async () => {
    const parent = makeFolder('parent');
    const child = makeFolder('parent', 'child');
    const collection = makeBruCollection('Shared', 'parent', 'child', 'shared');

    const result = await findCollectionsInFolders([child, parent, parent]);

    expect(result.collections).toEqual([{ path: collection, name: 'Shared' }]);
    expect(result.folders.map((folder) => folder.collectionPaths)).toEqual([[collection], [collection], [collection]]);
  });

  it('matches folders by real path when one pick is a link to another', async () => {
    const real = makeFolder('real');
    const collection = makeBruCollection('Linked', 'real', 'linked');
    const alias = path.join(tempDir, 'alias');
    fs.symlinkSync(real, alias, folderLinkType);

    const result = await findCollectionsInFolders([real, alias]);

    expect(result.collections).toEqual([{ path: collection, name: 'Linked' }]);
    expect(result.folders.map((folder) => [folder.status, folder.collectionPaths])).toEqual([
      ['folder', [collection]],
      ['folder', [collection]]
    ]);
  });

  it('does not list a picked collection again when another pick is inside it', async () => {
    const outer = makeBruCollection('Outer', 'outer');
    const inner = makeFolder('outer', 'requests');
    const nested = makeBruCollection('Nested', 'outer', 'requests', 'nested');

    const result = await findCollectionsInFolders([outer, inner]);

    expect(result.folders).toEqual([folderSummary(outer, 'collection', [outer]), folderSummary(inner, 'folder', [nested])]);
  });

  it('still recognises a picked collection after an earlier pick used up the budget', async () => {
    makeFolder('large', 'a', 'b');
    makeFolder('large', 'c', 'd');
    const collection = makeBruCollection('Late', 'late');

    const result = await findCollectionsInFolders([path.join(tempDir, 'large'), collection], { maxFolders: 2 });

    expect(result.stoppedEarly).toBe(true);
    expect(result.folders[1]).toEqual(folderSummary(collection, 'collection', [collection]));
  });

  it('skips excluded folders', async () => {
    const appData = makeFolder('app-data');
    const transient = makeFolder('app-data', 'tmp', 'transient');
    makeBruCollection('Scratch', 'app-data', 'tmp', 'transient', '123', 'bruno-scratch-1');

    const result = await findCollectionsInFolders([appData], { excludedFolders: [transient] });

    expect(result.collections).toEqual([]);
  });

  it('accepts an excluded folder that does not exist yet', async () => {
    const collection = makeBruCollection('Kept', 'kept');

    const result = await findCollectionsInFolders([tempDir], { excludedFolders: [path.join(tempDir, 'not-created')] });

    expect(result.collections).toEqual([{ path: collection, name: 'Kept' }]);
  });

  it('says when it stopped before searching every folder', async () => {
    makeFolder('a', 'b', 'c');
    makeBruCollection('Late', 'd', 'e', 'f', 'late');

    const result = await findCollectionsInFolders([tempDir], { maxFolders: 2 });

    expect(result.stoppedEarly).toBe(true);
    expect(result.collections).toEqual([]);
  });

  it('names every collection when there are more than it reads at once', async () => {
    const workspace = makeFolder('many');
    const expected = Array.from({ length: 40 }, (_unused, index) => {
      const name = `Collection ${index}`;
      return { path: makeBruCollection(name, 'many', `collection-${index}`), name };
    });

    const result = await findCollectionsInFolders([workspace]);

    expect(result.collections).toHaveLength(40);
    expect(result.collections).toEqual(expect.arrayContaining(expected));
  });

  it('stops when the search is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(findCollectionsInFolders([tempDir], { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError'
    });
  });
});
