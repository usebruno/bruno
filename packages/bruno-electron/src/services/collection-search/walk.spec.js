const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CollectionWalker, toPathKey, isSameOrInside } = require('./walk');

const folderLinkType = process.platform === 'win32' ? 'junction' : 'dir';
const canRemoveReadAccess = process.platform !== 'win32' && process.getuid() !== 0;

describe('CollectionWalker', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-walk-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  const makeFolder = (...segments) => {
    const folderPath = path.join(tempDir, ...segments);
    fs.mkdirSync(folderPath, { recursive: true });
    return folderPath;
  };

  const makeCollection = (configFile, ...segments) => {
    const folderPath = makeFolder(...segments);
    fs.writeFileSync(path.join(folderPath, configFile), '{}');
    return folderPath;
  };

  const walk = async (rootPath, options = {}) => {
    const walker = new CollectionWalker({ maxFolders: 1000, ...options });
    await walker.walk(rootPath);
    return walker;
  };

  const foundPaths = (walker) => walker.collections.map((collection) => collection.path).sort();

  it('reports the picked folder when it is a collection and does not look inside it', async () => {
    makeCollection('bruno.json', 'inner');
    fs.writeFileSync(path.join(tempDir, 'opencollection.yml'), '');

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([tempDir]);
    expect(walker.folderCount).toBe(1);
  });

  it('finds collections with either config file at any depth', async () => {
    const first = makeCollection('bruno.json', 'a');
    const second = makeCollection('opencollection.yml', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k');
    makeFolder('l', 'm');

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([first, second].sort());
    expect(walker.collections.find((collection) => collection.path === second).key).toBe(toPathKey(second));
  });

  it('never lists a collection nested inside another collection', async () => {
    const outer = makeCollection('bruno.json', 'outer');
    makeCollection('bruno.json', 'outer', 'nested');

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([outer]);
  });

  it('does not treat a folder named like a config file as a collection', async () => {
    makeFolder('looks-like', 'bruno.json');

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([]);
  });

  it('skips hidden, dependency, build and system folders and app bundles', async () => {
    [
      ['.collections'],
      ['node_modules', 'package'],
      ['.git', 'hooks'],
      ['dist'],
      ['build'],
      ['target'],
      ['out'],
      ['venv'],
      ['__pycache__'],
      ['bower_components'],
      ['Library'],
      ['AppData'],
      ['Applications'],
      ['CMakeFiles'],
      ['Tool.app'],
      ['Kit.framework'],
      ['Project.xcodeproj']
    ].forEach((segments) => makeCollection('bruno.json', ...segments, 'collection'));
    const kept = makeCollection('bruno.json', 'projects', 'api');

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([kept]);
  });

  it('searches folders that are only named like Linux system folders', async () => {
    const collections = ['dev', 'proc', 'sys'].map((name) => makeCollection('bruno.json', name, 'payments'));

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual(collections.sort());
  });

  it('skips the kernel folders at the root of a Linux system', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const fsPromises = require('node:fs/promises');
    const folder = (name) => ({ name, isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false });
    const realpath = jest.spyOn(fsPromises, 'realpath').mockImplementation(async (target) => target);
    const readdir = jest.spyOn(fsPromises, 'readdir').mockImplementation(async (target) =>
      (target === '/' ? ['proc', 'sys', 'dev', 'home'].map(folder) : []));

    try {
      await walk('/');

      expect(readdir.mock.calls.map(([target]) => target)).toEqual(['/', path.join('/', 'home')]);
    } finally {
      Object.defineProperty(process, 'platform', originalPlatform);
      realpath.mockRestore();
      readdir.mockRestore();
    }
  });

  it('searches the picked folder itself even when its name would be skipped', async () => {
    const picked = makeFolder('build');
    const collection = makeCollection('bruno.json', 'build', 'api');

    const walker = await walk(picked);

    expect(foundPaths(walker)).toEqual([collection]);
  });

  it('does not follow folder links', async () => {
    makeCollection('bruno.json', 'elsewhere', 'linked');
    const picked = makeFolder('picked');
    fs.symlinkSync(path.join(tempDir, 'elsewhere'), path.join(picked, 'to-elsewhere'), folderLinkType);
    fs.symlinkSync(path.join(tempDir, 'elsewhere', 'linked'), path.join(picked, 'collection-link'), folderLinkType);

    const walker = await walk(picked);

    expect(foundPaths(walker)).toEqual([]);
    expect(walker.unreadableFolderCount).toBe(0);
  });

  it('reports a picked folder that is itself a link by its real path', async () => {
    const target = makeCollection('bruno.json', 'real-collection');
    const link = path.join(tempDir, 'collection-link');
    fs.symlinkSync(target, link, folderLinkType);

    const walker = await walk(link);

    expect(foundPaths(walker)).toEqual([target]);
  });

  it('skips the mount points it is told to skip', async () => {
    const mounted = makeFolder('volumes', 'network-share');
    makeCollection('bruno.json', 'volumes', 'network-share', 'remote');
    const local = makeCollection('bruno.json', 'volumes', 'local');

    const walker = await walk(path.join(tempDir, 'volumes'), { skippedMountPoints: new Set([mounted]) });

    expect(foundPaths(walker)).toEqual([local]);
  });

  it('skips a mount point reached through a link in the picked path', async () => {
    const mounted = makeFolder('real', 'share');
    makeCollection('bruno.json', 'real', 'share', 'remote');
    makeCollection('bruno.json', 'real', 'local');
    const link = path.join(tempDir, 'link');
    fs.symlinkSync(path.join(tempDir, 'real'), link, folderLinkType);

    const walker = await walk(link, { skippedMountPoints: new Set([mounted]) });

    expect(foundPaths(walker)).toEqual([path.join(link, 'local')]);
  });

  (process.platform === 'win32' ? it.skip : it)('does not treat a named pipe called bruno.json as a collection config', async () => {
    const folder = makeFolder('pipe');
    execFileSync('mkfifo', [path.join(folder, 'bruno.json')]);

    const walker = await walk(tempDir);

    expect(foundPaths(walker)).toEqual([]);
  });

  (canRemoveReadAccess ? it : it.skip)('skips and counts folders it cannot read', async () => {
    const locked = makeFolder('locked');
    makeCollection('bruno.json', 'locked', 'hidden-away');
    const visible = makeCollection('bruno.json', 'open');
    fs.chmodSync(locked, 0o000);

    try {
      const walker = await walk(tempDir);

      expect(foundPaths(walker)).toEqual([visible]);
      expect(walker.unreadableFolderCount).toBe(1);
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  });

  it('visits each folder once across walks of overlapping folders', async () => {
    const collection = makeCollection('bruno.json', 'parent', 'child', 'collection');
    const walker = new CollectionWalker({ maxFolders: 1000 });

    await walker.walk(path.join(tempDir, 'parent'));
    await walker.walk(path.join(tempDir, 'parent', 'child'));

    expect(foundPaths(walker)).toEqual([collection]);
  });

  it('skips excluded folders', async () => {
    const excluded = makeFolder('app-data', 'transient');
    makeCollection('bruno.json', 'app-data', 'transient', 'bruno-scratch-1');
    const kept = makeCollection('bruno.json', 'app-data', 'kept');

    const walker = await walk(tempDir, { excludedKeys: [toPathKey(excluded)] });

    expect(foundPaths(walker)).toEqual([kept]);
  });

  it('stops after the folder budget and says it stopped early', async () => {
    makeFolder('a', 'b', 'c');
    makeFolder('d', 'e');

    const walker = await walk(tempDir, { maxFolders: 3 });

    expect(walker.folderCount).toBe(3);
    expect(walker.stoppedEarly).toBe(true);
  });

  it('does not report stopping early when the budget is enough', async () => {
    makeFolder('a', 'b');

    const walker = await walk(tempDir, { maxFolders: 3 });

    expect(walker.stoppedEarly).toBe(false);
  });

  it('still looks at a picked folder after an earlier pick used up the budget', async () => {
    makeFolder('large', 'a', 'b');
    makeFolder('large', 'c', 'd');
    const collection = makeCollection('bruno.json', 'collection');
    const walker = new CollectionWalker({ maxFolders: 2 });

    await walker.walk(path.join(tempDir, 'large'));
    await walker.walk(collection);

    expect(walker.stoppedEarly).toBe(true);
    expect(foundPaths(walker)).toEqual([collection]);
  });

  it('counts a collection folder that disappears before it can be checked', async () => {
    makeCollection('bruno.json', 'vanishing');
    const kept = makeCollection('bruno.json', 'kept');
    const fsPromises = require('node:fs/promises');
    const lstat = fsPromises.lstat;
    const spy = jest.spyOn(fsPromises, 'lstat').mockImplementation((target, ...args) =>
      (target.endsWith('vanishing')
        ? Promise.reject(Object.assign(new Error('gone'), { code: 'ENOENT' }))
        : lstat(target, ...args)));

    try {
      const walker = await walk(tempDir);

      expect(foundPaths(walker)).toEqual([kept]);
      expect(walker.unreadableFolderCount).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('falls back to Node’s own real path lookup when the native one fails', async () => {
    const collection = makeCollection('bruno.json', 'collection');
    const fsPromises = require('node:fs/promises');
    const spy = jest.spyOn(fsPromises, 'realpath').mockRejectedValue(Object.assign(new Error('EISDIR'), { code: 'EISDIR' }));

    try {
      const walker = await walk(tempDir);

      expect(foundPaths(walker)).toEqual([collection]);
      expect(walker.unreadableFolderCount).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('stops when the search is cancelled', async () => {
    makeCollection('bruno.json', 'a');
    const controller = new AbortController();
    controller.abort();

    await expect(walk(tempDir, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isSameOrInside', () => {
  const root = path.parse(os.tmpdir()).root;

  it('matches the folder itself and folders inside it', () => {
    const parent = path.join(root, 'work');

    expect(isSameOrInside(parent, parent)).toBe(true);
    expect(isSameOrInside(parent, path.join(parent, 'api'))).toBe(true);
  });

  it('does not match a sibling that shares the name prefix', () => {
    expect(isSameOrInside(path.join(root, 'work'), path.join(root, 'workshop'))).toBe(false);
  });

  it('treats the drive or file system root as containing everything', () => {
    expect(isSameOrInside(root, path.join(root, 'work'))).toBe(true);
  });
});
