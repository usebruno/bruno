const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

jest.mock('../collection-search/mount-points', () => ({ readMountTable: jest.fn(), skippedMountPointsOf: jest.fn() }));
jest.mock('./cloud-folders', () => ({ findCloudFolders: jest.fn(), isDatalessFile: jest.fn(), findCloudOnlyFiles: jest.fn() }));
jest.mock('./whole-computer', () => ({ planWholeComputer: jest.fn() }));

const { readMountTable, skippedMountPointsOf } = require('../collection-search/mount-points');
const { findCloudFolders, isDatalessFile, findCloudOnlyFiles } = require('./cloud-folders');
const { planWholeComputer } = require('./whole-computer');
const { scanLocations } = require('./scan');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const folderLinkType = process.platform === 'win32' ? 'junction' : 'dir';
const canRemoveReadAccess = process.platform !== 'win32' && process.getuid() !== 0;
const readFolder = fsPromises.readdir;
const planOf = (plan) => ({ roots: [], volumeRoots: [], prunePaths: [], mountPrunePaths: [], ...plan });

describe('scanLocations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-scan-')));
    jest.clearAllMocks();
    readMountTable.mockResolvedValue([]);
    skippedMountPointsOf.mockReturnValue(new Set());
    findCloudFolders.mockResolvedValue({ syncFolders: [], placeholderFolders: [] });
    isDatalessFile.mockResolvedValue(false);
    findCloudOnlyFiles.mockResolvedValue(new Set());
    planWholeComputer.mockReturnValue(planOf({}));
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    jest.restoreAllMocks();
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

  const location = (id, ...segments) => ({ id, path: path.join(tempDir, ...segments) });

  const computerAt = (...segments) => ({ id: 'computer', path: path.join(tempDir, ...segments), kind: 'computer' });

  const mtimeOf = (folderPath) => Math.floor(fs.statSync(folderPath).mtimeMs);

  const scan = async ({ locations, recents = [], excludedPaths = [], onCollection = () => {}, ...options }) => {
    const collections = [];
    const statuses = await scanLocations({
      locations,
      recents,
      excludedPaths,
      homePath: path.join(tempDir, 'user-home'),
      ...options,
      onCollection: (collection) => {
        collections.push(collection);
        onCollection(collection);
      }
    });
    return { collections, statuses };
  };

  const foundPaths = (collections) => collections.map((collection) => collection.path).sort();

  const ownedPaths = (collections) => collections.map((collection) => [collection.path, collection.locationId]).sort();

  const holdCallsFor = (method, heldPath) => {
    const original = fsPromises[method];
    let release;
    const released = new Promise((resolve) => {
      release = resolve;
    });
    jest.spyOn(fsPromises, method).mockImplementation(async (target, options) => {
      if (target === heldPath) {
        await released;
      }
      return original(target, options);
    });
    return release;
  };

  const trackReadsInFlight = () => {
    const reads = { inFlight: 0, mostInFlight: 0 };
    jest.spyOn(fsPromises, 'readdir').mockImplementation(async (target, options) => {
      reads.inFlight += 1;
      reads.mostInFlight = Math.max(reads.mostInFlight, reads.inFlight);
      try {
        return await readFolder(target, options);
      } finally {
        reads.inFlight -= 1;
      }
    });
    return reads;
  };

  const deleteAfterReading = (deletedPath) => {
    jest.spyOn(fsPromises, 'readdir').mockImplementation(async (target, options) => {
      const entries = await readFolder(target, options);
      if (target === deletedPath) {
        fs.rmSync(deletedPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
      return entries;
    });
  };

  it('finds bru and yml collections with their manifest names and modified times', async () => {
    const payments = makeBruCollection('Payments', 'work', 'payments');
    const orders = makeYmlCollection('"Orders: v2"', 'work', 'team', 'orders');

    const { collections, statuses } = await scan({ locations: [location('work', 'work')] });

    expect([...collections].sort((first, second) => first.path.localeCompare(second.path))).toEqual([
      { path: payments, name: 'Payments', mtime: mtimeOf(payments), locationId: 'work' },
      { path: orders, name: 'Orders: v2', mtime: mtimeOf(orders), locationId: 'work' }
    ]);
    expect(collections.every((collection) => collection.mtime > 0)).toBe(true);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 2 }]);
  });

  it('never lists a collection inside another collection, and lists a location that is a collection once', async () => {
    const outer = makeBruCollection('Outer', 'work', 'outer');
    makeBruCollection('Nested', 'work', 'outer', 'nested');
    const single = makeBruCollection('Single', 'single');
    makeBruCollection('Inside single', 'single', 'inside');

    const { collections, statuses } = await scan({ locations: [location('work', 'work'), location('single', 'single')] });

    expect(ownedPaths(collections)).toEqual([[outer, 'work'], [single, 'single']].sort());
    expect(statuses).toEqual([
      { id: 'work', status: 'done', found: 1 },
      { id: 'single', status: 'done', found: 1 }
    ]);
  });

  it('skips hidden, dependency, build and bundle folders, but searches dev, proc and sys below the location', async () => {
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
    ].forEach((segments) => makeBruCollection('Skipped', 'home', ...segments, 'collection'));
    const kept = ['dev', 'proc', 'sys'].map((name) => makeBruCollection('Kept', 'home', name, 'payments'));

    const { collections } = await scan({ locations: [location('home', 'home')] });

    expect(foundPaths(collections)).toEqual(kept.sort());
  });

  it('searches a location even when its own name would be skipped', async () => {
    const collection = makeBruCollection('Build API', 'build', 'api');

    const { collections } = await scan({ locations: [location('build', 'build')] });

    expect(foundPaths(collections)).toEqual([collection]);
  });

  it('finds a collection 32 folders below the file system root but not one 33 below, from any location', async () => {
    const levels = (prefix, count) => Array.from({ length: count }, (_value, index) => `${prefix}${index + 1}`);
    const rootPath = makeFolder('root');
    const rootDepth = path.relative(path.parse(rootPath).root, rootPath).split(path.sep).length;
    const atLimit = makeBruCollection('At limit', 'root', ...levels('a', 32 - rootDepth));
    makeBruCollection('Past limit', 'root', ...levels('b', 33 - rootDepth));

    const { collections } = await scan({ locations: [location('root', 'root')] });
    const { collections: fromDeeper } = await scan({ locations: [location('deeper', 'root', 'b1', 'b2')] });

    expect(foundPaths(collections)).toEqual([atLimit]);
    expect(fromDeeper).toEqual([]);
  });

  it('does not follow folder links', async () => {
    makeBruCollection('Elsewhere', 'elsewhere', 'linked');
    const picked = makeFolder('picked');
    fs.symlinkSync(path.join(tempDir, 'elsewhere'), path.join(picked, 'to-elsewhere'), folderLinkType);
    fs.symlinkSync(path.join(tempDir, 'elsewhere', 'linked'), path.join(picked, 'collection-link'), folderLinkType);

    const { collections, statuses } = await scan({ locations: [location('picked', 'picked')] });

    expect(collections).toEqual([]);
    expect(statuses).toEqual([{ id: 'picked', status: 'done', found: 0 }]);
  });

  (process.platform === 'win32' ? it.skip : it)('counts a collection whose manifest is a link', async () => {
    const manifest = path.join(makeFolder('manifests'), 'bruno.json');
    fs.writeFileSync(manifest, JSON.stringify({ name: 'Linked manifest' }));
    const collection = makeFolder('work', 'api');
    fs.symlinkSync(manifest, path.join(collection, 'bruno.json'));

    const { collections } = await scan({ locations: [location('work', 'work')] });

    expect(collections).toEqual([expect.objectContaining({ path: collection, name: 'Linked manifest' })]);
  });

  it('reports a location that links to a collection by its real path', async () => {
    const target = makeBruCollection('Real', 'real-collection');
    const link = path.join(tempDir, 'collection-link');
    fs.symlinkSync(target, link, folderLinkType);

    const { collections } = await scan({ locations: [{ id: 'link', path: link }] });

    expect(collections).toEqual([expect.objectContaining({ path: target, name: 'Real', locationId: 'link' })]);
  });

  it('lists a location that is a collection under its folder name when it disappears right after it is read, while the other locations finish', async () => {
    const api = makeBruCollection('API', 'api');
    const kept = makeBruCollection('Kept', 'work', 'kept');
    deleteAfterReading(api);

    const { collections, statuses } = await scan({ locations: [location('api', 'api'), location('work', 'work')] });

    expect([...collections].sort((first, second) => first.path.localeCompare(second.path))).toEqual([
      { path: api, name: 'api', mtime: 0, locationId: 'api' },
      { path: kept, name: 'Kept', mtime: mtimeOf(kept), locationId: 'work' }
    ]);
    expect(statuses).toEqual([
      { id: 'api', status: 'done', found: 1 },
      { id: 'work', status: 'done', found: 1 }
    ]);
  });

  it('credits each collection to the innermost location and reports it once', async () => {
    const outerCollection = makeBruCollection('Outer API', 'outer', 'api');
    const innerCollection = makeBruCollection('Inner API', 'outer', 'team', 'inner', 'api');
    const innerLocation = location('inner', 'outer', 'team', 'inner');
    const readdir = jest.spyOn(fsPromises, 'readdir');

    const { collections, statuses } = await scan({ locations: [location('outer', 'outer'), innerLocation] });

    expect(readdir.mock.calls.filter(([target]) => target === innerLocation.path)).toHaveLength(1);
    expect(ownedPaths(collections)).toEqual([[outerCollection, 'outer'], [innerCollection, 'inner']].sort());
    expect(statuses).toEqual([
      { id: 'outer', status: 'done', found: 1 },
      { id: 'inner', status: 'done', found: 1 }
    ]);
  });

  it('walks a folder reached through two spellings once, and the other spelling finds nothing', async () => {
    makeBruCollection('API', 'real', 'api');
    const real = path.join(tempDir, 'real');
    const link = path.join(tempDir, 'link');
    fs.symlinkSync(real, link, folderLinkType);
    const readdir = jest.spyOn(fsPromises, 'readdir');

    const { collections, statuses } = await scan({ locations: [{ id: 'real', path: real }, { id: 'link', path: link }] });

    expect(readdir.mock.calls.filter(([target]) => target === real || target === link)).toHaveLength(1);
    expect(collections).toEqual([expect.objectContaining({ name: 'API' })]);
    expect(statuses.map((status) => status.status)).toEqual(['done', 'done']);
    expect(statuses.map((status) => status.found).sort()).toEqual([0, 1]);
  });

  it('reports missing and file locations as missing while the other locations finish', async () => {
    const file = path.join(tempDir, 'notes.txt');
    fs.writeFileSync(file, 'not a folder');
    makeBruCollection('Kept', 'work', 'kept');

    const { statuses } = await scan({ locations: [location('missing', 'missing'), { id: 'file', path: file }, location('work', 'work')] });

    expect(statuses).toEqual([
      { id: 'missing', status: 'missing', found: 0 },
      { id: 'file', status: 'missing', found: 0 },
      { id: 'work', status: 'done', found: 1 }
    ]);
  });

  (canRemoveReadAccess ? it : it.skip)('reports an unreadable location as denied and skips unreadable folders inside a location', async () => {
    const locked = makeFolder('locked');
    makeBruCollection('Hidden away', 'locked', 'api');
    const lockedInside = makeFolder('work', 'locked-inside');
    makeBruCollection('Also hidden', 'work', 'locked-inside', 'api');
    const visible = makeBruCollection('Visible', 'work', 'visible');
    fs.chmodSync(locked, 0o000);
    fs.chmodSync(lockedInside, 0o000);

    try {
      const { collections, statuses } = await scan({ locations: [{ id: 'locked', path: locked }, location('work', 'work')] });

      expect(foundPaths(collections)).toEqual([visible]);
      expect(statuses).toEqual([
        { id: 'locked', status: 'denied', found: 0 },
        { id: 'work', status: 'done', found: 1 }
      ]);
    } finally {
      fs.chmodSync(locked, 0o755);
      fs.chmodSync(lockedInside, 0o755);
    }
  });

  it('reports a Windows network share as missing without reading it', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const readdir = jest.spyOn(fsPromises, 'readdir');
    const realpath = jest.spyOn(fsPromises, 'realpath');

    const { statuses } = await scan({ locations: [{ id: 'share', path: '\\\\server\\share' }] });

    expect(statuses).toEqual([{ id: 'share', status: 'missing', found: 0 }]);
    expect(readdir).not.toHaveBeenCalled();
    expect(realpath).not.toHaveBeenCalled();
  });

  it('skips the excluded folder and finds nothing in a location inside it', async () => {
    const excluded = makeFolder('app-data', 'tmp', 'transient');
    const scratchLocation = makeBruCollection('Scratch', 'app-data', 'tmp', 'transient', '1234', 'scratch');
    makeBruCollection('Scratch', 'app-data', 'tmp', 'transient', '5678', 'scratch');
    const kept = makeBruCollection('Kept', 'app-data', 'collections', 'kept');

    const { collections, statuses } = await scan({
      locations: [location('app-data', 'app-data'), { id: 'inside', path: scratchLocation }],
      excludedPaths: [excluded]
    });

    expect(foundPaths(collections)).toEqual([kept]);
    expect(statuses).toEqual([
      { id: 'app-data', status: 'done', found: 1 },
      { id: 'inside', status: 'done', found: 0 }
    ]);
  });

  it('skips a cloud sync folder whose path goes through a link', async () => {
    makeBruCollection('Synced', 'data', 'home', 'Dropbox', 'api');
    const kept = makeBruCollection('Kept', 'data', 'home', 'work', 'api');
    const homeLink = path.join(tempDir, 'home');
    fs.symlinkSync(path.join(tempDir, 'data', 'home'), homeLink, folderLinkType);
    findCloudFolders.mockResolvedValue({ syncFolders: [path.join(homeLink, 'Dropbox')], placeholderFolders: [] });

    const { collections } = await scan({ locations: [location('data', 'data')] });

    expect(foundPaths(collections)).toEqual([kept]);
  });

  it('skips a cloud sync folder below any location, but walks a location inside one', async () => {
    const dropbox = makeFolder('home', 'Dropbox');
    makeBruCollection('Synced', 'home', 'Dropbox', 'synced-api');
    const picked = makeBruCollection('Picked', 'home', 'Dropbox', 'picked', 'api');
    const local = makeBruCollection('Local', 'home', 'work', 'api');
    findCloudFolders.mockResolvedValue({ syncFolders: [dropbox], placeholderFolders: [dropbox] });
    const readdir = jest.spyOn(fsPromises, 'readdir');

    const { collections } = await scan({ locations: [location('home', 'home'), location('picked', 'home', 'Dropbox', 'picked')] });

    expect(ownedPaths(collections)).toEqual([[local, 'home'], [picked, 'picked']].sort());
    expect(readdir.mock.calls.map(([target]) => target)).not.toContain(dropbox);
  });

  it('reads the mount table and the cloud folders once, and does not enter the mount points the table skips', async () => {
    const mounted = makeFolder('volumes', 'network-share');
    makeBruCollection('Remote', 'volumes', 'network-share', 'remote');
    const local = makeBruCollection('Local', 'volumes', 'local');
    makeFolder('other');
    const mounts = [{ path: mounted, kind: 'network' }];
    readMountTable.mockResolvedValue(mounts);
    skippedMountPointsOf.mockReturnValue(new Set([mounted]));
    const env = { PATH: '/usr/bin' };
    const homePath = path.join(tempDir, 'home');

    const { collections } = await scan({ locations: [location('volumes', 'volumes'), location('other', 'other')], platform: 'linux', env, homePath });

    expect(foundPaths(collections)).toEqual([local]);
    expect(readMountTable.mock.calls).toEqual([[{ platform: 'linux', env, detectUsb: false }]]);
    expect(skippedMountPointsOf.mock.calls).toEqual([[mounts, 'linux']]);
    expect(findCloudFolders.mock.calls).toEqual([[{ platform: 'linux', homePath, env }]]);
  });

  it('walks a local disk that Choose folder skips, such as an NTFS or encrypted FUSE disk', async () => {
    const fuseDisk = makeFolder('data', 'windows');
    const fuseApi = makeBruCollection('NTFS API', 'data', 'windows', 'api');
    const usb = makeFolder('data', 'usb');
    makeBruCollection('USB API', 'data', 'usb', 'api');
    readMountTable.mockResolvedValue([{ path: fuseDisk, kind: 'local' }, { path: usb, kind: 'removable' }]);
    skippedMountPointsOf.mockReturnValue(new Set([fuseDisk, usb]));

    const { collections } = await scan({ locations: [location('data', 'data')], platform: 'linux' });

    expect(foundPaths(collections)).toEqual([fuseApi]);
  });

  it('reads no mount table on Windows unless the whole computer is searched', async () => {
    makeFolder('work');
    makeFolder('system');
    const env = {};

    await scan({ locations: [location('work', 'work')], platform: 'win32', env });

    expect(readMountTable).not.toHaveBeenCalled();
    expect(skippedMountPointsOf.mock.calls).toEqual([[[], 'win32']]);

    await scan({ locations: [location('work', 'work'), computerAt('system')], platform: 'win32', env });

    expect(readMountTable.mock.calls).toEqual([[{ platform: 'win32', env, detectUsb: true }]]);
  });

  it('walks a Windows placeholder folder that is listed as a link', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const entry = (name, kind) => ({
      name,
      isDirectory: () => kind === 'folder',
      isFile: () => kind === 'file',
      isSymbolicLink: () => kind === 'link'
    });
    const oneDrive = path.join(path.parse(tempDir).root, 'OneDrive');
    jest.spyOn(fsPromises, 'realpath').mockImplementation(async (target) => target);
    jest.spyOn(fsPromises, 'readdir').mockImplementation(async (target) =>
      (target === oneDrive ? [entry('Team API', 'link')] : [entry('bruno.json', 'file')]));
    jest.spyOn(fsPromises, 'lstat').mockResolvedValue({ isDirectory: () => true });

    const { collections } = await scan({ locations: [{ id: 'onedrive', path: oneDrive }] });

    expect(collections).toEqual([{ path: path.join(oneDrive, 'Team API'), name: 'Team API', mtime: 0, locationId: 'onedrive' }]);
  });

  it('lists a recent outside every location only when the whole computer is searched, under its stored name', async () => {
    const recent = makeBruCollection('Manifest name', 'elsewhere', 'api');
    makeFolder('work');
    const recents = [{ path: recent, name: 'Stored name' }];

    const { collections: withoutComputer, statuses } = await scan({ locations: [location('work', 'work')], recents });
    const { collections: withComputer } = await scan({ locations: [location('work', 'work'), computerAt('system')], recents });

    expect(withoutComputer).toEqual([]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 0 }]);
    expect(withComputer).toEqual([{ path: recent, name: 'Stored name', mtime: mtimeOf(recent), locationId: 'recents' }]);
  });

  it('credits a recent that the walk skips to the innermost location that holds it', async () => {
    const recent = makeBruCollection('Manifest name', 'work', '.archive', 'api');

    const { collections, statuses } = await scan({
      locations: [location('all', ''), location('work', 'work')],
      recents: [{ path: recent, name: 'Stored name' }]
    });

    expect(collections).toEqual([{ path: recent, name: 'Stored name', mtime: mtimeOf(recent), locationId: 'work' }]);
    expect(statuses).toEqual([
      { id: 'all', status: 'done', found: 0 },
      { id: 'work', status: 'done', found: 1 }
    ]);
  });

  it('leaves out recents that are gone or no longer collections', async () => {
    const recent = makeBruCollection('Manifest name', 'work', '.archive', 'api');
    const plainFolder = makeFolder('work', '.archive', 'plain-folder');

    const { collections, statuses } = await scan({
      locations: [location('work', 'work')],
      recents: [
        { path: path.join(tempDir, 'work', '.archive', 'gone'), name: 'Gone' },
        { path: plainFolder, name: 'Plain folder' },
        { path: recent, name: 'Stored name' }
      ]
    });

    expect(collections).toEqual([{ path: recent, name: 'Stored name', mtime: mtimeOf(recent), locationId: 'work' }]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 1 }]);
  });

  it('leaves out a recent that disappears right after it is read, while the locations finish', async () => {
    const recent = makeBruCollection('Manifest name', 'work', '.archive', 'api');
    const kept = makeBruCollection('Kept', 'work', 'kept');
    deleteAfterReading(recent);

    const { collections, statuses } = await scan({
      locations: [location('work', 'work')],
      recents: [{ path: recent, name: 'Stored name' }]
    });

    expect(collections).toEqual([{ path: kept, name: 'Kept', mtime: mtimeOf(kept), locationId: 'work' }]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 1 }]);
  });

  it('hands a recent inside a location over to that location, keeping the path the recent was listed with', async () => {
    const collection = makeBruCollection('Manifest name', 'work', 'api');
    const link = path.join(tempDir, 'api-link');
    fs.symlinkSync(collection, link, folderLinkType);
    const releaseWalk = holdCallsFor('readdir', path.join(tempDir, 'work'));

    const { collections, statuses } = await scan({
      locations: [location('work', 'work')],
      recents: [{ path: link, name: 'Stored name' }],
      onCollection: () => releaseWalk()
    });

    expect(collections).toEqual([
      { path: link, name: 'Stored name', mtime: mtimeOf(collection), locationId: 'work' },
      { path: link, name: 'Manifest name', mtime: mtimeOf(collection), locationId: 'work' }
    ]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 1 }]);
  });

  it('does not list a recent again when the walk found it first', async () => {
    const collection = makeBruCollection('Manifest name', 'work', 'api');
    const link = path.join(tempDir, 'api-link');
    fs.symlinkSync(collection, link, folderLinkType);
    const releaseRecents = holdCallsFor('readdir', link);

    const { collections, statuses } = await scan({
      locations: [location('work', 'work')],
      recents: [{ path: link, name: 'Stored name' }],
      onCollection: (row) => {
        if (row.locationId === 'work') {
          releaseRecents();
        }
      }
    });

    expect(collections).toEqual([{ path: collection, name: 'Manifest name', mtime: mtimeOf(collection), locationId: 'work' }]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 1 }]);
  });

  it('checks at most four recents at a time', async () => {
    const recents = Array.from({ length: 10 }, (_value, index) => ({ path: makeFolder(`recent-${index}`), name: `Recent ${index}` }));
    const reads = trackReadsInFlight();

    await scan({ locations: [], recents });

    expect(reads.mostInFlight).toBe(4);
  });

  it('walks each location as soon as its own real path is known', async () => {
    const quick = makeBruCollection('Quick', 'quick', 'api');
    makeBruCollection('Slow', 'slow', 'api');
    const slowLocation = location('slow', 'slow');
    const releaseSlow = holdCallsFor('realpath', slowLocation.path);

    const { collections, statuses } = await scan({
      locations: [slowLocation, location('quick', 'quick')],
      onCollection: (row) => {
        if (row.path === quick) {
          releaseSlow();
        }
      }
    });

    expect(collections.map((row) => row.locationId)).toEqual(['quick', 'slow']);
    expect(statuses).toEqual([
      { id: 'slow', status: 'done', found: 1 },
      { id: 'quick', status: 'done', found: 1 }
    ]);
  });

  it('keeps at most 16 folder reads in flight', async () => {
    Array.from({ length: 40 }, (_value, index) => makeFolder('wide', `folder-${index}`, 'child'));
    const reads = trackReadsInFlight();

    await scan({ locations: [location('wide', 'wide')] });

    expect(reads.mostInFlight).toBe(16);
  });

  it('returns each location’s status and count in the order the locations came in', async () => {
    makeBruCollection('B one', 'b', 'one');
    makeBruCollection('B two', 'b', 'two');
    makeBruCollection('A one', 'a', 'one');

    const { statuses } = await scan({ locations: [location('b', 'b'), location('missing', 'missing'), location('a', 'a')] });

    expect(statuses).toEqual([
      { id: 'b', status: 'done', found: 2 },
      { id: 'missing', status: 'missing', found: 0 },
      { id: 'a', status: 'done', found: 1 }
    ]);
  });

  it('fails the scan when a found collection cannot be reported', async () => {
    makeBruCollection('API', 'work', 'api');

    await expect(scanLocations({
      locations: [location('work', 'work')],
      recents: [],
      excludedPaths: [],
      homePath: path.join(tempDir, 'user-home'),
      onCollection: () => {
        throw new Error('The port is closed');
      }
    })).rejects.toThrow('The port is closed');
  });

  describe('a location that holds system folders, while the whole computer is not searched', () => {
    it('skips the folders the whole computer prunes, and walks only the roots it adds inside those folders', async () => {
      const system = makeFolder('system');
      const workApi = makeBruCollection('Work API', 'system', 'work', 'api');
      makeBruCollection('Shared tool', 'system', 'usr', 'share', 'tool');
      const localTool = makeBruCollection('Local tool', 'system', 'usr', 'local', 'tool');
      makeBruCollection('Volume API', 'system', 'Volumes', 'backup', 'api');
      makeBruCollection('App tools', 'system', 'Applications', 'tools', 'api');
      makeBruCollection('Elsewhere API', 'elsewhere', 'api');
      const mounts = [{ path: path.join(system, 'Volumes', 'backup'), kind: 'removable' }];
      readMountTable.mockResolvedValue(mounts);
      planWholeComputer.mockReturnValue(planOf({
        roots: [system, path.join(system, 'usr', 'local'), path.join(system, 'Applications'), path.join(tempDir, 'elsewhere')],
        volumeRoots: [path.join(system, 'Volumes', 'backup')],
        prunePaths: [path.join(system, 'usr'), path.join(system, 'Volumes')]
      }));
      const env = { SystemRoot: 'C:\\Windows' };
      const readdir = jest.spyOn(fsPromises, 'readdir');

      const { collections, statuses } = await scan({ locations: [location('system', 'system')], platform: 'linux', env });

      expect(ownedPaths(collections)).toEqual([[workApi, 'system'], [localTool, 'system']].sort());
      expect(readdir.mock.calls.map(([target]) => target)).not.toContain(path.join(system, 'usr', 'share'));
      expect(readdir.mock.calls.map(([target]) => target)).not.toContain(path.join(system, 'Volumes', 'backup'));
      expect(planWholeComputer.mock.calls).toEqual([[{ platform: 'linux', mounts, env }]]);
      expect(readMountTable.mock.calls).toEqual([[{ platform: 'linux', env, detectUsb: false }]]);
      expect(statuses).toEqual([{ id: 'system', status: 'done', found: 2 }]);
    });

    it('walks a duplicate view of a disk, which only the whole computer search skips', async () => {
      const system = makeFolder('system');
      const copyApi = makeBruCollection('Copy API', 'system', 'home', 'me', 'data', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [system], mountPrunePaths: [path.join(system, 'home', 'me', 'data')] }));
      const home = location('home', 'system', 'home', 'me');

      const { collections: withoutComputer } = await scan({ locations: [home], platform: 'linux' });
      const { collections: withComputer } = await scan({ locations: [home, computerAt('system')], platform: 'linux' });

      expect(ownedPaths(withoutComputer)).toEqual([[copyApi, 'home']]);
      expect(withComputer).toEqual([]);
    });

    it('credits a root the whole computer adds to the innermost location that holds it', async () => {
      const system = makeFolder('system');
      const localTool = makeBruCollection('Local tool', 'system', 'usr', 'local', 'tool');
      planWholeComputer.mockReturnValue(planOf({ roots: [system, path.join(system, 'usr', 'local')], prunePaths: [path.join(system, 'usr')] }));

      const { collections, statuses } = await scan({
        locations: [location('system', 'system'), location('usr', 'system', 'usr')],
        platform: 'linux'
      });

      expect(ownedPaths(collections)).toEqual([[localTool, 'usr']]);
      expect(statuses).toEqual([
        { id: 'system', status: 'done', found: 0 },
        { id: 'usr', status: 'done', found: 1 }
      ]);
    });

    it('walks the Desktop, Documents and Downloads in a cloud sync folder that a location holds, as the whole computer does', async () => {
      const oneDrive = makeFolder('system', 'Users', 'me', 'OneDrive');
      const dropbox = makeFolder('elsewhere', 'Dropbox');
      const desktopApi = makeBruCollection('Desktop API', 'system', 'Users', 'me', 'OneDrive', 'Desktop', 'api');
      makeBruCollection('Shared API', 'system', 'Users', 'me', 'OneDrive', 'Shared', 'api');
      makeBruCollection('Dropbox documents API', 'elsewhere', 'Dropbox', 'Documents', 'api');
      findCloudFolders.mockResolvedValue({ syncFolders: [oneDrive, dropbox], placeholderFolders: [] });
      const knownFolders = [path.join(oneDrive, 'Desktop'), path.join(dropbox, 'Documents')];
      const readdir = jest.spyOn(fsPromises, 'readdir');

      const { collections, statuses } = await scan({ locations: [location('users', 'system', 'Users')], platform: 'linux', knownFolders });

      expect(ownedPaths(collections)).toEqual([[desktopApi, 'users']]);
      expect(statuses).toEqual([{ id: 'users', status: 'done', found: 1 }]);
      expect(readdir.mock.calls.map(([target]) => target)).not.toContain(oneDrive);
    });

    it('builds the Windows prunes from the drive letters of the locations, without reading the mount table', async () => {
      const env = { SystemRoot: 'C:\\Windows' };

      await scan({
        locations: [{ id: 'c-drive', path: 'C:\\' }, { id: 'work', path: 'D:\\work' }, { id: 'more-work', path: 'D:\\more' }, { id: 'share', path: '\\\\server\\share' }],
        platform: 'win32',
        env
      });

      expect(readMountTable).not.toHaveBeenCalled();
      expect(planWholeComputer.mock.calls).toEqual([[{ platform: 'win32', mounts: [{ path: 'C:\\', kind: 'local' }, { path: 'D:\\', kind: 'local' }], env }]]);
    });
  });

  describe('the whole computer', () => {
    it('walks each of its roots and the locations inside them once, and credits each collection to the location closest to it', async () => {
      const system = makeFolder('system');
      const work = makeBruCollection('Work API', 'system', 'work', 'api');
      makeBruCollection('Shared tool', 'system', 'usr', 'share', 'tool');
      const localTool = makeBruCollection('Local tool', 'system', 'usr', 'local', 'tool');
      makeBruCollection('Fixture', 'system', 'private', 'tmp', 'fixture');
      const usbApi = makeBruCollection('USB API', 'system', 'Volumes', 'usb', 'api');
      makeBruCollection('Other system', 'system', 'Volumes', 'usb', 'System', 'api');
      const homeApi = makeBruCollection('Home API', 'system', 'Users', 'me', 'api');
      const home = { ...location('home', 'system', 'Users', 'me'), kind: 'home' };
      const mounts = [{ path: path.join(system, 'Volumes', 'usb'), kind: 'removable' }];
      readMountTable.mockResolvedValue(mounts);
      planWholeComputer.mockReturnValue(planOf({
        roots: [system, path.join(system, 'usr', 'local'), path.join(system, 'Volumes', 'usb')],
        prunePaths: [path.join(system, 'usr'), path.join(system, 'private'), path.join(system, 'Volumes'), path.join(system, 'Volumes', 'usb', 'System')]
      }));
      const env = { SystemRoot: 'C:\\Windows' };
      const readdir = jest.spyOn(fsPromises, 'readdir');

      const { collections, statuses } = await scan({ locations: [home, computerAt('system')], platform: 'linux', env });

      expect(ownedPaths(collections)).toEqual([[work, 'computer'], [localTool, 'computer'], [usbApi, 'computer'], [homeApi, 'home']].sort());
      expect(readdir.mock.calls.filter(([target]) => target === home.path)).toHaveLength(1);
      expect(planWholeComputer.mock.calls).toEqual([[{ platform: 'linux', mounts, env }]]);
      expect(readMountTable.mock.calls).toEqual([[{ platform: 'linux', env, detectUsb: true }]]);
      expect(statuses).toEqual([
        { id: 'home', status: 'done', found: 1 },
        { id: 'computer', status: 'done', found: 3 }
      ]);
    });

    it('applies its prunes inside every location, and still walks a location that lies in a folder it prunes', async () => {
      const system = makeFolder('system');
      makeBruCollection('Cached', 'data', 'cache', 'api');
      const dataApi = makeBruCollection('Data API', 'data', 'api');
      const privateWork = makeBruCollection('Private work', 'system', 'private', 'work', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [system], prunePaths: [path.join(tempDir, 'data', 'cache'), path.join(system, 'private')] }));

      const { collections, statuses } = await scan({
        locations: [location('data', 'data'), location('private-work', 'system', 'private', 'work'), computerAt('system')],
        platform: 'linux'
      });

      expect(ownedPaths(collections)).toEqual([[dataApi, 'data'], [privateWork, 'private-work']].sort());
      expect(statuses).toEqual([
        { id: 'data', status: 'done', found: 1 },
        { id: 'private-work', status: 'done', found: 1 },
        { id: 'computer', status: 'done', found: 0 }
      ]);
    });

    it('reports a missing location while it searches the rest', async () => {
      makeFolder('system');
      const systemApi = makeBruCollection('System API', 'system', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [path.join(tempDir, 'system')], prunePaths: [] }));

      const { collections, statuses } = await scan({ locations: [location('gone', 'gone'), computerAt('system')], platform: 'linux' });

      expect(ownedPaths(collections)).toEqual([[systemApi, 'computer']]);
      expect(statuses).toEqual([
        { id: 'gone', status: 'missing', found: 0 },
        { id: 'computer', status: 'done', found: 1 }
      ]);
    });

    it.each([
      ['its system root is missing', 'missing-system', 'usb', 'missing'],
      ['only one of its other roots is missing', 'system', 'missing-usb', 'done']
    ])('reports its status from its system root alone when %s', async (_label, systemName, usbName, status) => {
      makeBruCollection('System API', 'system', 'api');
      makeBruCollection('USB API', 'usb', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [path.join(tempDir, systemName), path.join(tempDir, usbName)], prunePaths: [] }));

      const { statuses } = await scan({ locations: [computerAt(systemName)], platform: 'linux' });

      expect(statuses).toEqual([{ id: 'computer', status, found: 1 }]);
    });

    it('walks Desktop, Documents and Downloads that lie in a cloud sync folder as roots of their own, and nothing else in that folder', async () => {
      const system = makeFolder('system');
      const oneDrive = makeFolder('system', 'Users', 'me', 'OneDrive');
      const desktopApi = makeBruCollection('Desktop API', 'system', 'Users', 'me', 'OneDrive', 'Desktop', 'api');
      makeBruCollection('Shared API', 'system', 'Users', 'me', 'OneDrive', 'Shared', 'api');
      const downloadsApi = makeBruCollection('Downloads API', 'system', 'Users', 'me', 'Downloads', 'api');
      findCloudFolders.mockResolvedValue({ syncFolders: [oneDrive], placeholderFolders: [oneDrive] });
      planWholeComputer.mockReturnValue(planOf({ roots: [system], prunePaths: [] }));
      const desktop = path.join(oneDrive, 'Desktop');
      const knownFolders = [desktop, path.join(oneDrive, 'Documents'), path.join(system, 'Users', 'me', 'Downloads')];
      const readdir = jest.spyOn(fsPromises, 'readdir');

      const { collections, statuses } = await scan({ locations: [computerAt('system')], platform: 'linux', knownFolders });

      expect(ownedPaths(collections)).toEqual([[desktopApi, 'computer'], [downloadsApi, 'computer']].sort());
      expect(statuses).toEqual([{ id: 'computer', status: 'done', found: 2 }]);
      expect(readdir.mock.calls.filter(([target]) => target === desktop)).toHaveLength(1);
      expect(readdir.mock.calls.map(([target]) => target)).not.toContain(oneDrive);
    });

    it('walks a Documents folder that links into a cloud sync folder', async () => {
      const system = makeFolder('system');
      const dropbox = makeFolder('system', 'home', 'Dropbox');
      makeBruCollection('Documents API', 'system', 'home', 'Dropbox', 'Documents', 'api');
      const documentsLink = path.join(system, 'home', 'Documents');
      fs.symlinkSync(path.join(dropbox, 'Documents'), documentsLink, folderLinkType);
      findCloudFolders.mockResolvedValue({ syncFolders: [dropbox], placeholderFolders: [dropbox] });
      planWholeComputer.mockReturnValue(planOf({ roots: [system], prunePaths: [] }));

      const { collections } = await scan({ locations: [computerAt('system')], platform: 'linux', knownFolders: [documentsLink] });

      expect(ownedPaths(collections)).toEqual([[path.join(documentsLink, 'api'), 'computer']]);
    });

    it('credits what its roots and the home folder find inside a location to that location, which counts the same as without the whole computer', async () => {
      const system = makeFolder('system');
      const meApi = makeBruCollection('Me API', 'system', 'Users', 'me', 'api');
      const toolApi = makeBruCollection('Tool API', 'system', 'Users', 'tools', 'api');
      const serverApi = makeBruCollection('Server API', 'system', 'srv', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [system, path.join(system, 'Users', 'tools')] }));
      const users = location('users', 'system', 'Users');
      const home = { ...location('home', 'system', 'Users', 'me'), kind: 'home' };

      const { statuses: withoutComputer } = await scan({ locations: [users], platform: 'linux' });
      const { collections, statuses } = await scan({ locations: [users, home, computerAt('system')], platform: 'linux' });

      expect(ownedPaths(collections)).toEqual([[meApi, 'users'], [toolApi, 'users'], [serverApi, 'computer']].sort());
      expect(statuses).toEqual([
        { id: 'users', status: 'done', found: 2 },
        { id: 'home', status: 'done', found: 0 },
        { id: 'computer', status: 'done', found: 1 }
      ]);
      expect(withoutComputer).toEqual([{ id: 'users', status: 'done', found: 2 }]);
    });

    it('leaves a root that is also another location to that location, which walks it once under the whole computer prunes', async () => {
      const system = makeFolder('system');
      const systemApi = makeBruCollection('System API', 'system', 'api');
      makeBruCollection('Pruned API', 'system', 'usr', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [system], prunePaths: [path.join(system, 'usr')] }));
      const readdir = jest.spyOn(fsPromises, 'readdir');

      const { collections, statuses } = await scan({ locations: [{ id: 'system-folder', path: system, kind: 'user' }, computerAt('system')], platform: 'linux' });

      expect(ownedPaths(collections)).toEqual([[systemApi, 'system-folder']]);
      expect(readdir.mock.calls.filter(([target]) => target === system)).toHaveLength(1);
      expect(statuses).toEqual([
        { id: 'system-folder', status: 'done', found: 1 },
        { id: 'computer', status: 'done', found: 0 }
      ]);
    });

    (canRemoveReadAccess ? it : it.skip)('reports a location that is also one of its roots as denied when that folder cannot be read', async () => {
      makeFolder('system');
      const usb = makeFolder('usb');
      makeBruCollection('USB API', 'usb', 'api');
      planWholeComputer.mockReturnValue(planOf({ roots: [path.join(tempDir, 'system'), usb], prunePaths: [] }));
      fs.chmodSync(usb, 0o000);

      try {
        const { statuses } = await scan({ locations: [{ id: 'usb', path: usb, kind: 'user' }, computerAt('system')], platform: 'linux' });

        expect(statuses).toEqual([
          { id: 'usb', status: 'denied', found: 0 },
          { id: 'computer', status: 'done', found: 0 }
        ]);
      } finally {
        fs.chmodSync(usb, 0o755);
      }
    });
  });

  const byPath = (collections) => [...collections].sort((first, second) => first.path.localeCompare(second.path));

  it('on macOS hides a collection in a placeholder folder whose manifest is only in the cloud, a recent there too, and never reads those manifests', async () => {
    const offline = makeBruCollection('Offline name', 'cloud', 'offline-api');
    const mixed = makeYmlCollection('Mixed name', 'cloud', 'mixed-api');
    fs.writeFileSync(path.join(mixed, 'bruno.json'), JSON.stringify({ name: 'Mixed bru name' }));
    const local = makeBruCollection('Local name', 'cloud', 'local-api');
    const outside = makeBruCollection('Outside name', 'work', 'api');
    const recentInCloud = makeBruCollection('Recent manifest name', 'cloud', '.archive', 'recent-api');
    const datalessFiles = [path.join(offline, 'bruno.json'), path.join(mixed, 'bruno.json'), path.join(recentInCloud, 'bruno.json')];
    findCloudFolders.mockResolvedValue({ syncFolders: [], placeholderFolders: [path.join(tempDir, 'cloud')] });
    isDatalessFile.mockImplementation(async (filePath) => datalessFiles.includes(filePath));
    const open = jest.spyOn(fsPromises, 'open');

    const { collections, statuses } = await scan({
      locations: [location('cloud', 'cloud'), location('work', 'work')],
      recents: [{ path: recentInCloud, name: 'Recent stored name' }],
      platform: 'darwin'
    });

    expect(byPath(collections)).toEqual([
      { path: local, name: 'Local name', mtime: mtimeOf(local), locationId: 'cloud' },
      { path: outside, name: 'Outside name', mtime: mtimeOf(outside), locationId: 'work' }
    ]);
    expect(statuses).toEqual([
      { id: 'cloud', status: 'done', found: 1 },
      { id: 'work', status: 'done', found: 1 }
    ]);
    const openedFiles = open.mock.calls.map(([target]) => target);
    [offline, mixed, recentInCloud].forEach((folderPath) => {
      expect(openedFiles).not.toContain(path.join(folderPath, 'bruno.json'));
      expect(openedFiles).not.toContain(path.join(folderPath, 'opencollection.yml'));
    });
    expect(isDatalessFile).toHaveBeenCalledWith(path.join(local, 'bruno.json'));
    expect(isDatalessFile).not.toHaveBeenCalledWith(path.join(outside, 'bruno.json'));
    expect(findCloudOnlyFiles).not.toHaveBeenCalled();
  });

  it('on Windows checks the collections in a cloud sync folder after the walk, shows the ones on disk and hides the rest, recents included', async () => {
    const oneDrive = makeFolder('OneDrive');
    const local = makeBruCollection('Local name', 'OneDrive', 'local-api');
    const cloud = makeBruCollection('Cloud name', 'OneDrive', 'cloud-api');
    const localRecent = makeYmlCollection('Recent manifest name', 'OneDrive', 'Recent', 'local-recent');
    const cloudRecent = makeBruCollection('Cloud recent manifest name', 'OneDrive', 'Recent', 'cloud-recent');
    const outside = makeBruCollection('Outside name', 'work', 'api');
    findCloudFolders.mockResolvedValue({ syncFolders: [oneDrive], placeholderFolders: [oneDrive] });
    findCloudOnlyFiles.mockImplementation(async (filePaths) => new Set(filePaths.filter((filePath) => filePath.includes('cloud-'))));
    const open = jest.spyOn(fsPromises, 'open');

    const { collections, statuses } = await scan({
      locations: [
        location('local-api', 'OneDrive', 'local-api'),
        location('cloud-api', 'OneDrive', 'cloud-api'),
        location('work', 'work'),
        location('all', '')
      ],
      recents: [{ path: localRecent, name: 'Recent stored name' }, { path: cloudRecent, name: 'Cloud recent stored name' }],
      platform: 'win32'
    });

    expect(byPath(collections)).toEqual([
      { path: local, name: 'Local name', mtime: mtimeOf(local), locationId: 'local-api' },
      { path: localRecent, name: 'Recent stored name', mtime: mtimeOf(localRecent), locationId: 'all' },
      { path: outside, name: 'Outside name', mtime: mtimeOf(outside), locationId: 'work' }
    ].sort((first, second) => first.path.localeCompare(second.path)));
    expect(statuses).toEqual([
      { id: 'local-api', status: 'done', found: 1 },
      { id: 'cloud-api', status: 'done', found: 0 },
      { id: 'work', status: 'done', found: 1 },
      { id: 'all', status: 'done', found: 1 }
    ]);
    expect(findCloudOnlyFiles.mock.calls.flatMap(([filePaths]) => filePaths).sort()).toEqual([
      path.join(local, 'bruno.json'),
      path.join(cloud, 'bruno.json'),
      path.join(localRecent, 'opencollection.yml'),
      path.join(cloudRecent, 'bruno.json')
    ].sort());
    const openedFiles = open.mock.calls.map(([target]) => target);
    expect(openedFiles).not.toContain(path.join(cloud, 'bruno.json'));
    expect(openedFiles).not.toContain(path.join(cloudRecent, 'bruno.json'));
    expect(isDatalessFile).not.toHaveBeenCalled();
  });

  it('on Windows checks the collections in a cloud sync folder in batches of 25', async () => {
    const oneDrive = makeFolder('OneDrive');
    Array.from({ length: 26 }, (_value, index) => makeBruCollection(`API ${index}`, 'OneDrive', `api-${index}`));
    findCloudFolders.mockResolvedValue({ syncFolders: [oneDrive], placeholderFolders: [oneDrive] });

    const { collections } = await scan({ locations: [location('onedrive', 'OneDrive')], platform: 'win32' });

    expect(collections).toHaveLength(26);
    expect(findCloudOnlyFiles.mock.calls.map(([filePaths]) => filePaths.length)).toEqual([25, 1]);
  });

  it('on Windows fails the scan when a collection checked after the walk cannot be reported', async () => {
    makeFolder('OneDrive');
    makeBruCollection('API', 'OneDrive', 'api');
    findCloudFolders.mockResolvedValue({ syncFolders: [path.join(tempDir, 'OneDrive')], placeholderFolders: [path.join(tempDir, 'OneDrive')] });

    await expect(scan({
      locations: [location('onedrive', 'OneDrive')],
      platform: 'win32',
      onCollection: () => {
        throw new Error('The port is closed');
      }
    })).rejects.toThrow('The port is closed');
  });

  describe('privacy prompts', () => {
    const knownFoldersIn = (homePath) => ['Desktop', 'Documents', 'Downloads'].map((name) => path.join(homePath, name));

    const trackReads = () => {
      const reads = [];
      let inFlight = 0;
      jest.spyOn(fsPromises, 'readdir').mockImplementation(async (target, options) => {
        reads.push({ target, alone: inFlight === 0, listsEntryKinds: Boolean(options && options.withFileTypes) });
        inFlight += 1;
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return await readFolder(target, options);
        } finally {
          inFlight -= 1;
        }
      });
      return reads;
    };

    it('on macOS first reads Desktop, Documents, Downloads and each removable root, one at a time, before searching', async () => {
      const homePath = makeFolder('home');
      makeFolder('home', 'Desktop');
      makeFolder('home', 'Documents');
      const usb = makeFolder('usb');
      makeBruCollection('USB API', 'usb', 'api');
      makeFolder('system');
      readMountTable.mockResolvedValue([{ path: usb, kind: 'removable' }]);
      planWholeComputer.mockReturnValue(planOf({ roots: [path.join(tempDir, 'system'), usb], prunePaths: [] }));
      const reads = trackReads();

      const { collections } = await scan({
        locations: [{ id: 'home', path: homePath, kind: 'home' }, computerAt('system')],
        platform: 'darwin',
        homePath,
        knownFolders: knownFoldersIn(homePath)
      });

      const firstReads = [...['Desktop', 'Documents', 'Downloads'].map((name) => path.join(homePath, name)), usb];
      expect(reads.slice(0, 4)).toEqual(firstReads.map((target) => ({ target, alone: true, listsEntryKinds: false })));
      expect(reads.slice(4).every((read) => read.listsEntryKinds)).toBe(true);
      expect(foundPaths(collections)).toEqual([path.join(usb, 'api')]);
    });

    it('on macOS reads only the protected folder that a location lies inside', async () => {
      const homePath = makeFolder('home');
      ['Desktop', 'Documents', 'Downloads'].forEach((name) => makeFolder('home', name));
      const reads = trackReads();

      await scan({ locations: [location('documents', 'home', 'Documents', 'bruno')], platform: 'darwin', homePath, knownFolders: knownFoldersIn(homePath) });

      expect(reads.filter((read) => !read.listsEntryKinds).map((read) => read.target)).toEqual([path.join(homePath, 'Documents')]);
    });

    it.each([
      ['on Linux', 'linux', 'home'],
      ['on macOS when no location reaches them', 'darwin', 'work']
    ])('reads no protected folder first %s', async (_label, platform, locationName) => {
      const homePath = makeFolder('home');
      ['Desktop', 'Documents', 'Downloads'].forEach((name) => makeFolder('home', name));
      makeFolder('work');
      const usb = makeFolder('usb');
      readMountTable.mockResolvedValue([{ path: usb, kind: 'removable' }]);
      const reads = trackReads();

      await scan({ locations: [location(locationName, locationName)], platform, homePath, knownFolders: knownFoldersIn(homePath) });

      expect(reads.every((read) => read.listsEntryKinds)).toBe(true);
    });
  });
});
