const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

jest.mock('../collection-search/mount-points', () => ({ getSkippedMountPoints: jest.fn() }));

const { getSkippedMountPoints } = require('../collection-search/mount-points');
const { scanLocations } = require('./scan');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const folderLinkType = process.platform === 'win32' ? 'junction' : 'dir';
const canRemoveReadAccess = process.platform !== 'win32' && process.getuid() !== 0;
const readFolder = fsPromises.readdir;

describe('scanLocations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-collection-scan-')));
    getSkippedMountPoints.mockResolvedValue(new Set());
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

  const mtimeOf = (folderPath) => Math.floor(fs.statSync(folderPath).mtimeMs);

  const scan = async ({ locations, recents = [], excludedPaths = [], onCollection = () => {} }) => {
    const collections = [];
    const statuses = await scanLocations({
      locations,
      recents,
      excludedPaths,
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

  it('finds a collection 12 levels below a location but not one 13 levels below', async () => {
    const levels = (prefix, count) => Array.from({ length: count }, (_value, index) => `${prefix}-${index + 1}`);
    const twelveDown = makeBruCollection('Twelve', 'root', ...levels('a', 12));
    makeBruCollection('Thirteen', 'root', ...levels('b', 13));

    const { collections } = await scan({ locations: [location('root', 'root')] });

    expect(foundPaths(collections)).toEqual([twelveDown]);
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

  it('does not enter skipped mount points', async () => {
    const mounted = makeFolder('volumes', 'network-share');
    makeBruCollection('Remote', 'volumes', 'network-share', 'remote');
    const local = makeBruCollection('Local', 'volumes', 'local');
    getSkippedMountPoints.mockResolvedValue(new Set([mounted]));

    const { collections } = await scan({ locations: [location('volumes', 'volumes')] });

    expect(foundPaths(collections)).toEqual([local]);
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

  it('lists a recent outside every location under its stored name', async () => {
    const recent = makeBruCollection('Manifest name', 'elsewhere', 'api');
    makeFolder('work');

    const { collections, statuses } = await scan({
      locations: [location('work', 'work')],
      recents: [{ path: recent, name: 'Stored name' }]
    });

    expect(collections).toEqual([{ path: recent, name: 'Stored name', mtime: mtimeOf(recent), locationId: 'recents' }]);
    expect(statuses).toEqual([{ id: 'work', status: 'done', found: 0 }]);
  });

  it('checks recents with no locations and leaves out recents that are gone or no longer collections', async () => {
    const recent = makeBruCollection('Manifest name', 'api');
    const plainFolder = makeFolder('plain-folder');

    const { collections, statuses } = await scan({
      locations: [],
      recents: [
        { path: path.join(tempDir, 'gone'), name: 'Gone' },
        { path: plainFolder, name: 'Plain folder' },
        { path: recent, name: 'Stored name' }
      ]
    });

    expect(collections).toEqual([{ path: recent, name: 'Stored name', mtime: mtimeOf(recent), locationId: 'recents' }]);
    expect(statuses).toEqual([]);
  });

  it('leaves out a recent that disappears right after it is read, while the locations finish', async () => {
    const recent = makeBruCollection('Manifest name', 'elsewhere', 'api');
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
      onCollection: (row) => {
        if (row.locationId === 'recents') {
          releaseWalk();
        }
      }
    });

    expect(collections).toEqual([
      { path: link, name: 'Stored name', mtime: mtimeOf(collection), locationId: 'recents' },
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
      onCollection: () => {
        throw new Error('The port is closed');
      }
    })).rejects.toThrow('The port is closed');
  });
});
