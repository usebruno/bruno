const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsExtra = require('fs-extra');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn(), emit: jest.fn() },
  app: { getPath: jest.fn(() => require('node:os').tmpdir()) }
}));
jest.mock('./mount', () => ({
  unmount: jest.fn(async () => {}),
  clearCollectionIndex: jest.fn()
}));
jest.mock('../app/collections', () => ({
  openCollection: jest.fn(async () => ({ opened: true }))
}));
jest.mock('../services/snapshot', () => ({
  setCollection: jest.fn()
}));
jest.mock('../store/bruno-config', () => ({
  clearBrunoConfig: jest.fn()
}));
jest.mock('../cache/requestUids', () => ({
  clearRequestUidsForCollection: jest.fn()
}));
// The worker pool needs a built dist + worker threads; unit tests run the sync
// equivalents instead — the conversion output is identical.
jest.mock('@usebruno/filestore', () => {
  const actual = jest.requireActual('@usebruno/filestore');
  return {
    ...actual,
    parseRequestViaWorker: async (content, options) => actual.parseRequest(content, options),
    stringifyRequestViaWorker: async (obj, options) => actual.stringifyRequest(obj, options),
    parseFolderViaWorker: async (content, options) => actual.parseFolder(content, options),
    stringifyFolderViaWorker: async (obj, options) => actual.stringifyFolder(obj, options),
    parseEnvironmentViaWorker: async (content, options) => actual.parseEnvironment(content, options),
    stringifyEnvironmentViaWorker: async (obj, options) => actual.stringifyEnvironment(obj, options)
  };
});

const { migrateCollectionOnDisk, MIGRATION_CANCELLED_MESSAGE } = require('./yml-migration');

const BRUNO_JSON = {
  version: '1',
  name: 'test-collection',
  type: 'collection',
  collectionVersion: '2.1.0'
};

const REQUEST_BRU = `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: http://localhost:3000/ping
}
`;

const FOLDER_BRU = `meta {
  name: api
}
`;

const ENV_BRU = `vars {
  host: http://localhost:3000
}
`;

const COLLECTION_BRU = `docs {
  Root level docs
}
`;

describe('migrateCollectionOnDisk', () => {
  let collectionDir;
  let backupRootDir;

  const filePath = (...segments) => path.join(collectionDir, ...segments);

  const listFilesRecursive = (dir) => {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(entryPath));
      } else {
        results.push(entryPath);
      }
    }
    return results.sort();
  };

  const snapshotDisk = () => {
    const files = {};
    for (const file of listFilesRecursive(collectionDir)) {
      files[path.relative(collectionDir, file)] = fs.readFileSync(file, 'utf8');
    }
    return files;
  };

  const runMigration = (overrides = {}) =>
    migrateCollectionOnDisk({
      collectionPathname: collectionDir,
      brunoConfig: { ...BRUNO_JSON },
      backupRootDir,
      ...overrides
    });

  beforeEach(() => {
    collectionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-collection-'));
    backupRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-backup-'));

    fs.writeFileSync(filePath('bruno.json'), JSON.stringify(BRUNO_JSON, null, 2));
    fs.writeFileSync(filePath('collection.bru'), COLLECTION_BRU);
    fs.writeFileSync(filePath('ping.bru'), REQUEST_BRU);
    fs.mkdirSync(filePath('api'));
    fs.writeFileSync(filePath('api', 'folder.bru'), FOLDER_BRU);
    fs.writeFileSync(filePath('api', 'get-users.bru'), REQUEST_BRU.replace('ping', 'get-users'));
    fs.mkdirSync(filePath('environments'));
    fs.writeFileSync(filePath('environments', 'Local.bru'), ENV_BRU);
    fs.writeFileSync(filePath('README.md'), '# not a bru file\n');
  });

  afterEach(() => {
    fsExtra.removeSync(collectionDir);
    fsExtra.removeSync(backupRootDir);
    jest.restoreAllMocks();
  });

  it('converts every .bru file, removes the sources and leaves other files untouched', async () => {
    const { brunoConfig } = await runMigration();

    const remaining = listFilesRecursive(collectionDir).map((file) => path.relative(collectionDir, file));
    expect(remaining).toEqual(
      [
        'README.md',
        'opencollection.yml',
        'ping.yml',
        path.join('api', 'folder.yml'),
        path.join('api', 'get-users.yml'),
        path.join('environments', 'Local.yml')
      ].sort()
    );

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('opencollection:');
    expect(fs.readFileSync(filePath('README.md'), 'utf8')).toBe('# not a bru file\n');

    expect(brunoConfig.opencollection).toBe('1.0.0');
    expect(brunoConfig.version).toBe('2.1.0');
    expect(brunoConfig.collectionVersion).toBeUndefined();

    // backup is removed once the migration committed
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('emits parsing, writing and finalizing progress with consistent totals', async () => {
    const events = [];
    await runMigration({ emitProgress: (phase, current, total) => events.push({ phase, current, total }) });

    const phases = [...new Set(events.map((event) => event.phase))];
    expect(phases).toEqual(['parsing', 'writing', 'finalizing']);

    for (const phase of phases) {
      const phaseEvents = events.filter((event) => event.phase === phase);
      const { total } = phaseEvents[0];
      expect(phaseEvents.map((event) => event.current)).toEqual(
        Array.from({ length: phaseEvents.length }, (_, i) => i + 1)
      );
      expect(phaseEvents[phaseEvents.length - 1].current).toBe(total);
    }

    // 5 .bru files parsed; 4 converted + opencollection.yml written; 5 .bru + bruno.json removed
    expect(events.filter((e) => e.phase === 'parsing').length).toBe(5);
    expect(events.filter((e) => e.phase === 'writing').length).toBe(5);
    expect(events.filter((e) => e.phase === 'finalizing').length).toBe(6);
  });

  it('aborts before writing anything when a file fails to parse', async () => {
    fs.writeFileSync(filePath('broken.bru'), 'meta { this is not parseable');
    const before = snapshotDisk();

    await expect(runMigration()).rejects.toThrow(/failed to parse/);

    expect(snapshotDisk()).toEqual(before);
  });

  it('aborts without touching disk when a target yml file already exists', async () => {
    fs.writeFileSync(filePath('ping.yml'), 'pre-existing file\n');
    const before = snapshotDisk();

    await expect(runMigration()).rejects.toThrow(/already exist/);

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readFileSync(filePath('ping.yml'), 'utf8')).toBe('pre-existing file\n');
  });

  it('leaves the collection untouched when cancelled during parsing', async () => {
    const before = snapshotDisk();
    let calls = 0;
    const checkCancelled = () => {
      if (++calls > 2) {
        throw new Error(MIGRATION_CANCELLED_MESSAGE);
      }
    };

    await expect(runMigration({ checkCancelled })).rejects.toThrow(MIGRATION_CANCELLED_MESSAGE);

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('restores removed sources and deletes written yml when finalizing fails midway', async () => {
    const before = snapshotDisk();
    const realUnlink = fs.promises.unlink.bind(fs.promises);
    let unlinkCalls = 0;
    jest.spyOn(fs.promises, 'unlink').mockImplementation(async (target) => {
      if (++unlinkCalls === 3) {
        throw new Error('EPERM: simulated lock');
      }
      return realUnlink(target);
    });

    await expect(runMigration()).rejects.toThrow('EPERM: simulated lock');

    expect(snapshotDisk()).toEqual(before);
    expect(fs.readdirSync(backupRootDir)).toEqual([]);
  });

  it('keeps the backup and reports when a source cannot be restored', async () => {
    const realUnlink = fs.promises.unlink.bind(fs.promises);
    let unlinkCalls = 0;
    jest.spyOn(fs.promises, 'unlink').mockImplementation(async (target) => {
      if (++unlinkCalls === 3) {
        throw new Error('EPERM: simulated lock');
      }
      return realUnlink(target);
    });
    const realCopy = fsExtra.copy;
    jest.spyOn(fsExtra, 'copy').mockImplementation(async (src, dest) => {
      // let backup copies (into backupRootDir) pass; fail the restore copies back
      if (dest.startsWith(collectionDir)) {
        throw new Error('EACCES: simulated restore failure');
      }
      return realCopy(src, dest);
    });
    const reportError = jest.fn();

    await expect(runMigration({ reportError })).rejects.toThrow('EPERM: simulated lock');

    expect(reportError).toHaveBeenCalledWith(expect.stringContaining('could not be restored'));
    // the backup directory with the originals must survive for manual recovery
    expect(fs.readdirSync(backupRootDir)).toHaveLength(1);
  });
});
