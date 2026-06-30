const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const {
  isValidNpmPackageName,
  runNpmInstall,
  resolveNodeExecutable,
  resolveNpmCli,
  resolveNpmInvocation,
  clearNpmInvocationCache,
  buildSafeEnv,
  buildSpawnOptions,
  isWindowsBatchFile
} = require('../../src/utils/install-packages');

const nodeExecutableName = () => (process.platform === 'win32' ? 'node.exe' : 'node');
const fixturePath = (...segments) => path.join('fixtures', 'install-packages', ...segments);

const NODE_BIN = fixturePath('node', 'bin');
const NODE_EXECUTABLE = path.join(NODE_BIN, nodeExecutableName());
const NPM_SHIM = path.join(NODE_BIN, 'npm');
const NPM_CLI_LIB_LAYOUT = path.join(NODE_BIN, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const NPM_CLI_BESIDE_NODE = path.join(NODE_BIN, 'node_modules', 'npm', 'bin', 'npm-cli.js');
const NODE_DIR_BESIDE = fixturePath('nodejs');
const NODE_EXECUTABLE_BESIDE = path.join(NODE_DIR_BESIDE, nodeExecutableName());
const NPM_CLI_BESIDE_LAYOUT = path.join(NODE_DIR_BESIDE, 'node_modules', 'npm', 'bin', 'npm-cli.js');
const NVM_BIN_DIR = fixturePath('nvm', 'v20', 'bin');
const NVM_NODE_EXECUTABLE = path.join(NVM_BIN_DIR, nodeExecutableName());
const SYSTEM_BIN_DIR = fixturePath('system', 'bin');
const COLLECTION_DIR = fixturePath('collection');

const mockNpmInvocation = () => ({
  nodePath: NODE_EXECUTABLE,
  npmCliPath: NPM_CLI_LIB_LAYOUT
});

// Minimal stand-in for a child_process handle: stdout/stderr are emitters and
// the child itself emits 'close' / 'error'. Lets us drive npm outcomes
// deterministically without spawning a real process.
const makeFakeChild = () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn();
  return child;
};

describe('isValidNpmPackageName', () => {
  test.each([
    'lodash',
    'dayjs',
    'uuid',
    '@scope/pkg',
    'csv-parse',
    'package.name',
    '@team/secret-sauce'
  ])('accepts valid package name: %s', (name) => {
    expect(isValidNpmPackageName(name)).toBe(true);
  });

  test.each([
    ['empty string', ''],
    ['whitespace', 'foo bar'],
    ['shell injection', 'foo; rm -rf /'],
    ['command substitution', '$(whoami)'],
    ['leading dot', '.hidden'],
    ['non-string', 123],
    ['null', null],
    ['undefined', undefined]
  ])('rejects %s', (_label, name) => {
    expect(isValidNpmPackageName(name)).toBe(false);
  });
});

describe('resolveNodeExecutable', () => {
  let existsSyncSpy;

  beforeEach(() => {
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    delete process.env.NVM_BIN;
    delete process.env.FNM_MULTISHELL_PATH;
    delete process.env.PATH;
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
  });

  test('prefers NVM_BIN over PATH', () => {
    process.env.NVM_BIN = NVM_BIN_DIR;
    process.env.PATH = SYSTEM_BIN_DIR;
    existsSyncSpy.mockImplementation((candidate) => candidate === NVM_NODE_EXECUTABLE);

    expect(resolveNodeExecutable()).toBe(NVM_NODE_EXECUTABLE);
  });

  test('walks PATH when shim env vars are unset', () => {
    process.env.PATH = [NODE_BIN, SYSTEM_BIN_DIR].join(path.delimiter);
    existsSyncSpy.mockImplementation((candidate) => candidate === NODE_EXECUTABLE);

    expect(resolveNodeExecutable()).toBe(NODE_EXECUTABLE);
  });

  test('returns null when node is not found', () => {
    process.env.PATH = SYSTEM_BIN_DIR;
    expect(resolveNodeExecutable()).toBeNull();
  });
});

describe('resolveNpmCli', () => {
  let existsSyncSpy;

  beforeEach(() => {
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
  });

  test('skips bin/npm shim when npm-cli.js is present (nvm-windows)', () => {
    existsSyncSpy.mockImplementation(
      (candidate) => candidate === NPM_SHIM || candidate === NPM_CLI_BESIDE_NODE
    );

    expect(resolveNpmCli(NODE_EXECUTABLE)).toBe(NPM_CLI_BESIDE_NODE);
  });

  test('finds npm-cli via lib layout', () => {
    existsSyncSpy.mockImplementation((candidate) => candidate === NPM_CLI_LIB_LAYOUT);

    expect(resolveNpmCli(NODE_EXECUTABLE)).toBe(NPM_CLI_LIB_LAYOUT);
  });

  test('finds npm-cli via node_modules layout beside node', () => {
    existsSyncSpy.mockImplementation((candidate) => candidate === NPM_CLI_BESIDE_LAYOUT);

    expect(resolveNpmCli(NODE_EXECUTABLE_BESIDE)).toBe(NPM_CLI_BESIDE_LAYOUT);
  });
});

describe('resolveNpmInvocation', () => {
  beforeEach(() => {
    clearNpmInvocationCache();
  });

  test('caches the resolved invocation', () => {
    const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation((candidate) => {
      return candidate === NODE_EXECUTABLE || candidate === NPM_CLI_LIB_LAYOUT;
    });
    process.env.PATH = NODE_BIN;

    const first = resolveNpmInvocation();
    existsSyncSpy.mockRestore();

    expect(first).toEqual({ nodePath: NODE_EXECUTABLE, npmCliPath: NPM_CLI_LIB_LAYOUT });
    expect(resolveNpmInvocation()).toBe(first);
  });
});

describe('buildSafeEnv', () => {
  test('prepends the node bin directory to PATH', () => {
    process.env.PATH = SYSTEM_BIN_DIR;
    process.env.HOME = fixturePath('home');

    const env = buildSafeEnv(NODE_BIN);

    expect(env.PATH).toBe([NODE_BIN, SYSTEM_BIN_DIR].join(path.delimiter));
    expect(env.HOME).toBe(fixturePath('home'));
  });
});

describe('buildSpawnOptions', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('uses shell:false when spawning node.exe with npm-cli.js (CVE-2024-27980 safe)', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const nodePath = path.join('fixtures', 'install-packages', 'node', 'bin', 'node.exe');
    const npmCliPath = path.join('fixtures', 'install-packages', 'node', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
    const options = buildSpawnOptions({ nodePath, collectionPath: COLLECTION_DIR });

    expect(isWindowsBatchFile(nodePath)).toBe(false);
    expect(isWindowsBatchFile(npmCliPath)).toBe(false);
    expect(options.shell).toBe(false);
    expect(options.windowsHide).toBe(true);
    expect(options.cwd).toBe(COLLECTION_DIR);
  });

  test('uses shell:true only when the executable is a Windows batch file', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const npmCmd = path.join('fixtures', 'install-packages', 'node', 'bin', 'npm.cmd');
    expect(isWindowsBatchFile(npmCmd)).toBe(true);

    const options = buildSpawnOptions({ nodePath: npmCmd, collectionPath: COLLECTION_DIR });
    expect(options.shell).toBe(true);
  });

  test('does not treat batch extensions as special on non-Windows platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const npmCmd = path.join('fixtures', 'install-packages', 'node', 'bin', 'npm.cmd');
    expect(isWindowsBatchFile(npmCmd)).toBe(false);
  });
});

describe('runNpmInstall', () => {
  test('resolves success on exit code 0 and captures stdout', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);

    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['dayjs'],
      spawnFn,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    child.stdout.emit('data', Buffer.from('added 1 package'));
    child.emit('close', 0);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('added 1 package');
    expect(result.installed).toEqual(['dayjs']);
  });

  test('spawns node with npm-cli.js, correct args, cwd, and no shell', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);
    const systemPath = fixturePath('system', 'path');
    process.env.PATH = systemPath;

    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['dayjs', 'dayjs', 'zod'],
      spawnFn,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    child.emit('close', 0);
    await promise;

    expect(spawnFn).toHaveBeenCalledWith(
      NODE_EXECUTABLE,
      [NPM_CLI_LIB_LAYOUT, 'install', '--save', 'dayjs', 'zod'],
      expect.objectContaining({
        cwd: COLLECTION_DIR,
        shell: false,
        windowsHide: true,
        env: expect.objectContaining({
          PATH: [NODE_BIN, systemPath].join(path.delimiter)
        })
      })
    );
  });

  test('dedupes packages in the result', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a', 'a', 'b'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    child.emit('close', 0);
    const result = await promise;
    expect(result.installed).toEqual(['a', 'b']);
  });

  test('resolves failure on a non-zero exit and surfaces stderr', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['bad-pkg'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    child.stderr.emit('data', Buffer.from('npm ERR! 404 Not Found'));
    child.emit('close', 1);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('404 Not Found');
  });

  test('reports NPM_NOT_FOUND when npm cannot be resolved', async () => {
    const result = await runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      resolveNpmInvocationFn: () => null
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NPM_NOT_FOUND');
    expect(result.stderr).toMatch(/not found on your PATH/i);
  });

  test('reports NPM_NOT_FOUND when spawn fails with ENOENT', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    const err = new Error('spawn node ENOENT');
    err.code = 'ENOENT';
    child.emit('error', err);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NPM_NOT_FOUND');
    expect(result.stderr).toMatch(/not found on your PATH/i);
  });

  test('reports SPAWN_ERROR for non-ENOENT spawn errors', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    const err = new Error('EACCES permission denied');
    err.code = 'EACCES';
    child.emit('error', err);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SPAWN_ERROR');
  });

  test('reports SPAWN_FAILED when spawn throws synchronously', async () => {
    const spawnFn = jest.fn(() => {
      throw new Error('boom');
    });
    const result = await runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SPAWN_FAILED');
    expect(result.stderr).toContain('boom');
  });

  test('times out and kills the process if npm never exits', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation,
      timeoutMs: 1000
    });

    jest.advanceTimersByTime(1000);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('TIMEOUT');
    expect(child.kill).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('caps captured output to the trailing maxOutputBytes', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation,
      maxOutputBytes: 10
    });
    child.stdout.emit('data', 'abcdefghijklmnop'); // 16 chars
    child.emit('close', 0);

    const result = await promise;
    expect(result.stdout.length).toBeLessThanOrEqual(10);
    expect(result.stdout).toBe('ghijklmnop'); // keeps the tail
  });

  test('only settles once even if close fires after error', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: COLLECTION_DIR,
      packages: ['a'],
      spawnFn: () => child,
      resolveNpmInvocationFn: mockNpmInvocation
    });
    const err = new Error('spawn node ENOENT');
    err.code = 'ENOENT';
    child.emit('error', err);
    child.emit('close', 1); // should be ignored

    const result = await promise;
    expect(result.errorCode).toBe('NPM_NOT_FOUND');
  });
});
