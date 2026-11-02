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
  setCollection: jest.fn(),
  remapCollectionTabPaths: jest.fn()
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

const {
  migrateCollectionOnDisk,
  migrateCollectionToYml,
  stripBruExtInRunRequest,
  MIGRATION_CANCELLED_MESSAGE
} = require('./yml-migration');
const { openCollection } = require('../app/collections');
const snapshotManager = require('../services/snapshot');

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

const REQUEST_BRU_WITH_RUN_REQUEST = `meta {
  name: chain
  type: http
  seq: 1
}

get {
  url: http://localhost:3000/chain
}

script:pre-request {
  await bru.runRequest("newFolder/SecondReq.bru");
  await bru.runRequest('single/quoted.bru');
}

script:post-response {
  await bru.runRequest(\`template/literal.bru\`);
  await bru.runRequest("no-ext");
  await bru.runRequest("keeper.bruv");
}

tests {
  await bru.runRequest("tests/only.bru");
}
`;

const FOLDER_BRU_WITH_RUN_REQUEST = `meta {
  name: chained
}

script:pre-request {
  await bru.runRequest("folder-scoped/first.bru");
}
`;

const COLLECTION_BRU_WITH_RUN_REQUEST = `script:pre-request {
  await bru.runRequest("collection-scoped/first.bru");
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
    const { brunoConfig, tabPathMap } = await runMigration();

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

    expect(tabPathMap[filePath('ping.bru')]).toBe(filePath('ping.yml'));
    expect(tabPathMap[filePath('api', 'get-users.bru')]).toBe(filePath('api', 'get-users.yml'));
    expect(tabPathMap[filePath('environments', 'Local.bru')]).toBe(filePath('environments', 'Local.yml'));

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

  it('does not touch .bru files inside node_modules or .git', async () => {
    fs.mkdirSync(filePath('node_modules'));
    fs.writeFileSync(filePath('node_modules', 'stray.bru'), REQUEST_BRU);
    fs.mkdirSync(filePath('.git'));
    fs.writeFileSync(filePath('.git', 'inside-git.bru'), REQUEST_BRU);

    await runMigration();

    expect(fs.existsSync(filePath('node_modules', 'stray.bru'))).toBe(true);
    expect(fs.existsSync(filePath('.git', 'inside-git.bru'))).toBe(true);
    expect(fs.existsSync(filePath('node_modules', 'stray.yml'))).toBe(false);
    expect(fs.existsSync(filePath('.git', 'inside-git.yml'))).toBe(false);
  });

  it('does not follow symlinks pointing outside the collection', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-outside-'));
    const externalBru = path.join(outside, 'external.bru');
    try {
      fs.writeFileSync(externalBru, REQUEST_BRU);
      try {
        fs.symlinkSync(externalBru, filePath('linked.bru'));
      } catch (err) {
        // Skip on platforms/permissions where symlink creation fails (e.g. non-admin Windows).
        return;
      }

      await runMigration();

      expect(fs.existsSync(externalBru)).toBe(true);
      expect(fs.readFileSync(externalBru, 'utf8')).toBe(REQUEST_BRU);
      expect(fs.existsSync(filePath('linked.bru'))).toBe(true);
      expect(fs.existsSync(filePath('linked.yml'))).toBe(false);
    } finally {
      fsExtra.removeSync(outside);
    }
  });

  it('honors bruno.json `ignore` paths so vendored .bru files are not migrated', async () => {
    fs.mkdirSync(filePath('vendor'));
    fs.writeFileSync(filePath('vendor', 'lib.bru'), REQUEST_BRU);

    await runMigration({ brunoConfig: { ...BRUNO_JSON, ignore: ['vendor'] } });

    expect(fs.existsSync(filePath('vendor', 'lib.bru'))).toBe(true);
    expect(fs.existsSync(filePath('vendor', 'lib.yml'))).toBe(false);
  });

  it('upgrades a legacy-shape proxy block so it survives the yml stringifier', async () => {
    const legacyProxyConfig = {
      ...BRUNO_JSON,
      proxy: {
        enabled: true,
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { enabled: true, username: 'u', password: 'p' },
        bypassProxy: 'localhost,127.0.0.1'
      }
    };

    const { brunoConfig } = await runMigration({ brunoConfig: legacyProxyConfig });

    // Legacy `enabled: true` must become `inherit: false` (an explicit collection-level
    // proxy), not `inherit: true` (which would silently defer to the global proxy).
    expect(brunoConfig.proxy).toEqual(expect.objectContaining({
      inherit: false,
      config: expect.objectContaining({
        protocol: 'http',
        hostname: 'proxy.example.com',
        port: '8080',
        auth: { username: 'u', password: 'p' },
        bypassProxy: 'localhost,127.0.0.1'
      })
    }));

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('proxy.example.com');
  });

  it('strips the .bru extension from bru.runRequest calls across request, folder and collection scripts', async () => {
    fs.writeFileSync(filePath('collection.bru'), COLLECTION_BRU_WITH_RUN_REQUEST);
    fs.writeFileSync(filePath('chain.bru'), REQUEST_BRU_WITH_RUN_REQUEST);
    fs.writeFileSync(filePath('api', 'folder.bru'), FOLDER_BRU_WITH_RUN_REQUEST);

    await runMigration();

    const chainYml = fs.readFileSync(filePath('chain.yml'), 'utf8');
    expect(chainYml).toContain('bru.runRequest("newFolder/SecondReq")');
    expect(chainYml).toContain('bru.runRequest(\'single/quoted\')');
    expect(chainYml).toContain('bru.runRequest(`template/literal`)');
    expect(chainYml).toContain('bru.runRequest("tests/only")');
    // Untouched: extensionless call and a look-alike extension.
    expect(chainYml).toContain('bru.runRequest("no-ext")');
    expect(chainYml).toContain('bru.runRequest("keeper.bruv")');
    // No stray literal ".bru" survived any of the rewritten calls.
    expect(chainYml).not.toMatch(/bru\.runRequest\([^)]*\.bru['"`]\)/);

    const folderYml = fs.readFileSync(filePath('api', 'folder.yml'), 'utf8');
    expect(folderYml).toContain('bru.runRequest("folder-scoped/first")');
    expect(folderYml).not.toContain('folder-scoped/first.bru');

    const ocYml = fs.readFileSync(filePath('opencollection.yml'), 'utf8');
    expect(ocYml).toContain('bru.runRequest("collection-scoped/first")');
    expect(ocYml).not.toContain('collection-scoped/first.bru');
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

describe('stripBruExtInRunRequest', () => {
  it('rewrites standalone string-literal arguments in every quote style', () => {
    const input = [
      'await bru.runRequest("folder/one.bru");',
      'await bru.runRequest(\'folder/two.bru\');',
      'await bru.runRequest(`folder/three.bru`);'
    ].join('\n');
    const output = stripBruExtInRunRequest(input);
    expect(output).toBe([
      'await bru.runRequest("folder/one");',
      'await bru.runRequest(\'folder/two\');',
      'await bru.runRequest(`folder/three`);'
    ].join('\n'));
  });

  it('rewrites every eligible call on the same line', () => {
    const input = 'bru.runRequest("a.bru"); bru.runRequest("b.bru");';
    expect(stripBruExtInRunRequest(input)).toBe('bru.runRequest("a"); bru.runRequest("b");');
  });

  it('leaves calls inside line comments untouched', () => {
    const input = [
      '// bru.runRequest("commented.bru")',
      'bru.runRequest("real.bru");'
    ].join('\n');
    const output = stripBruExtInRunRequest(input);
    expect(output).toContain('// bru.runRequest("commented.bru")');
    expect(output).toContain('bru.runRequest("real")');
    expect(output).not.toContain('real.bru');
  });

  it('leaves calls inside block comments untouched', () => {
    const input = '/* bru.runRequest("block.bru") */ bru.runRequest("real.bru");';
    const output = stripBruExtInRunRequest(input);
    expect(output).toContain('/* bru.runRequest("block.bru") */');
    expect(output).toContain('bru.runRequest("real")');
  });

  it('leaves lookalike text inside an unrelated outer string literal untouched', () => {
    const single = 'const s = \'bru.runRequest("outer.bru")\';';
    const double = 'const s = "bru.runRequest(\'outer.bru\')";';
    expect(stripBruExtInRunRequest(single)).toBe(single);
    expect(stripBruExtInRunRequest(double)).toBe(double);
  });

  it('does not rewrite when the argument is a compound expression', () => {
    const cases = [
      'bru.runRequest("first.bru" + suffix)',
      'bru.runRequest("first.bru", { retries: 1 })',
      'bru.runRequest(getPath("first.bru"))',
      'bru.runRequest(`${prefix}` + ".bru")'
    ];
    for (const input of cases) {
      expect(stripBruExtInRunRequest(input)).toBe(input);
    }
  });

  it('does not rewrite calls whose argument does not end in .bru', () => {
    const cases = [
      'bru.runRequest("no-ext")',
      'bru.runRequest("looks/like.bruv")',
      'bru.runRequest("")'
    ];
    for (const input of cases) {
      expect(stripBruExtInRunRequest(input)).toBe(input);
    }
  });

  it('ignores identifiers that only end in "bru"', () => {
    const input = 'notbru.runRequest("foo.bru"); mybru.runRequest("bar.bru");';
    expect(stripBruExtInRunRequest(input)).toBe(input);
  });

  it('tolerates whitespace around the call punctuation', () => {
    const input = 'bru.runRequest\n(\n  "spaced/out.bru"\n)';
    expect(stripBruExtInRunRequest(input)).toBe('bru.runRequest\n(\n  "spaced/out"\n)');
  });

  it('is a no-op when the input never references runRequest', () => {
    const input = 'const x = 1;\nfunction f() { return x + 2; }';
    expect(stripBruExtInRunRequest(input)).toBe(input);
  });

  it('returns the input unchanged for empty or non-string values', () => {
    expect(stripBruExtInRunRequest('')).toBe('');
    expect(stripBruExtInRunRequest(null)).toBe(null);
    expect(stripBruExtInRunRequest(undefined)).toBe(undefined);
  });

  it('rewrites calls nested inside a template literal substitution', () => {
    const input = 'const msg = `Result: ${await bru.runRequest("nested/one.bru")}`;';
    expect(stripBruExtInRunRequest(input)).toBe(
      'const msg = `Result: ${await bru.runRequest("nested/one")}`;'
    );
  });

  it('descends into nested template substitutions', () => {
    const input = 'const s = `${`inner ${bru.runRequest("deep.bru")}`}`;';
    expect(stripBruExtInRunRequest(input)).toBe(
      'const s = `${`inner ${bru.runRequest("deep")}`}`;'
    );
  });

  it('leaves template literal text (outside substitutions) untouched', () => {
    const input = 'const s = `text bru.runRequest("outer.bru") text`;';
    expect(stripBruExtInRunRequest(input)).toBe(input);
  });

  it('leaves calls that appear inside a regex literal untouched', () => {
    const cases = [
      'const re = /bru\\.runRequest\\("foo\\.bru"\\)/;',
      'if (source.match(/bru\\.runRequest\\("bar.bru"\\)/)) {}',
      'const re = /[a-z]bru\\.runRequest\\("baz.bru"\\)/g;'
    ];
    for (const input of cases) {
      expect(stripBruExtInRunRequest(input)).toBe(input);
    }
  });

  it('rewrites a call that follows an unrelated division', () => {
    const input = 'const half = total / 2; bru.runRequest("real.bru");';
    expect(stripBruExtInRunRequest(input)).toBe(
      'const half = total / 2; bru.runRequest("real");'
    );
  });

  it('treats `/` after a value-expecting keyword as a regex, not division', () => {
    const input = 'function f() { return /bru\\.runRequest\\("kw.bru"\\)/; }';
    expect(stripBruExtInRunRequest(input)).toBe(input);
  });
});

describe('migrateCollectionToYml reopen', () => {
  let collectionDir;
  const collectionUid = 'col-uid';
  const mainWindow = { webContents: { send: jest.fn() } };
  const watcher = { removeWatcher: jest.fn() };

  beforeEach(() => {
    collectionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yml-migration-reopen-'));
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), JSON.stringify(BRUNO_JSON, null, 2));
    fs.writeFileSync(path.join(collectionDir, 'collection.bru'), COLLECTION_BRU);
    fs.writeFileSync(path.join(collectionDir, 'ping.bru'), REQUEST_BRU);
    openCollection.mockReset();
    openCollection.mockResolvedValue({ opened: true });
    snapshotManager.remapCollectionTabPaths.mockClear();
    mainWindow.webContents.send.mockClear();
  });

  afterEach(() => {
    fsExtra.removeSync(collectionDir);
  });

  it('fails the success path when openCollection returns opened: false', async () => {
    openCollection.mockResolvedValue({
      opened: false,
      error: 'broken opencollection.yml'
    });

    await expect(
      migrateCollectionToYml({
        mainWindow,
        watcher,
        collectionPathname: collectionDir,
        collectionUid
      })
    ).rejects.toThrow('broken opencollection.yml');

    // Disk migration still completed (yml present); reopen failure must not look like success.
    expect(fs.existsSync(path.join(collectionDir, 'opencollection.yml'))).toBe(true);
    expect(fs.existsSync(path.join(collectionDir, 'bruno.json'))).toBe(false);
  });

  it('still surfaces the migration error when reopen also returns opened: false', async () => {
    fs.writeFileSync(path.join(collectionDir, 'broken.bru'), 'meta { this is not parseable');
    openCollection.mockResolvedValue({
      opened: false,
      error: 'could not reopen'
    });

    await expect(
      migrateCollectionToYml({
        mainWindow,
        watcher,
        collectionPathname: collectionDir,
        collectionUid
      })
    ).rejects.toThrow(/failed to parse/);
  });
});
