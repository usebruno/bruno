const { EventEmitter } = require('events');
const { isValidNpmPackageName, runNpmInstall } = require('../../src/utils/install-packages');

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

describe('runNpmInstall', () => {
  test('resolves success on exit code 0 and captures stdout', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);

    const promise = runNpmInstall({ collectionPath: '/coll', packages: ['dayjs'], spawnFn });
    child.stdout.emit('data', Buffer.from('added 1 package'));
    child.emit('close', 0);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('added 1 package');
    expect(result.installed).toEqual(['dayjs']);
  });

  test('passes the correct npm args, cwd, and runs without a shell on Unix', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);

    const promise = runNpmInstall({
      collectionPath: '/my/coll',
      packages: ['dayjs', 'dayjs', 'zod'],
      spawnFn,
      npmCommand: 'npm',
      platform: 'darwin'
    });
    child.emit('close', 0);
    await promise;

    expect(spawnFn).toHaveBeenCalledWith(
      'npm',
      ['install', '--save', 'dayjs', 'zod'],
      expect.objectContaining({ cwd: '/my/coll', shell: false })
    );
  });

  test('uses shell on Windows when npm command is a .cmd file', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);

    const promise = runNpmInstall({
      collectionPath: 'C:\\coll',
      packages: ['dayjs'],
      spawnFn,
      npmCommand: 'npm.cmd',
      platform: 'win32'
    });
    child.emit('close', 0);
    await promise;

    expect(spawnFn).toHaveBeenCalledWith(
      'npm.cmd',
      ['install', '--save', 'dayjs'],
      expect.objectContaining({ cwd: 'C:\\coll', shell: true })
    );
  });

  test('does not use shell on Windows for bare npm command', async () => {
    const child = makeFakeChild();
    const spawnFn = jest.fn(() => child);

    const promise = runNpmInstall({
      collectionPath: 'C:\\coll',
      packages: ['dayjs'],
      spawnFn,
      npmCommand: 'npm',
      platform: 'win32'
    });
    child.emit('close', 0);
    await promise;

    expect(spawnFn).toHaveBeenCalledWith(
      'npm',
      ['install', '--save', 'dayjs'],
      expect.objectContaining({ cwd: 'C:\\coll', shell: false })
    );
  });

  test('dedupes packages in the result', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({ collectionPath: '/c', packages: ['a', 'a', 'b'], spawnFn: () => child });
    child.emit('close', 0);
    const result = await promise;
    expect(result.installed).toEqual(['a', 'b']);
  });

  test('resolves failure on a non-zero exit and surfaces stderr', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({ collectionPath: '/c', packages: ['bad-pkg'], spawnFn: () => child });
    child.stderr.emit('data', Buffer.from('npm ERR! 404 Not Found'));
    child.emit('close', 1);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('404 Not Found');
  });

  test('reports NPM_NOT_FOUND when npm is missing from PATH (ENOENT)', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({ collectionPath: '/c', packages: ['a'], spawnFn: () => child });
    const err = new Error('spawn npm ENOENT');
    err.code = 'ENOENT';
    child.emit('error', err);

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NPM_NOT_FOUND');
    expect(result.stderr).toMatch(/not found on your PATH/i);
  });

  test('reports SPAWN_ERROR for non-ENOENT spawn errors', async () => {
    const child = makeFakeChild();
    const promise = runNpmInstall({ collectionPath: '/c', packages: ['a'], spawnFn: () => child });
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
    const result = await runNpmInstall({ collectionPath: '/c', packages: ['a'], spawnFn });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SPAWN_FAILED');
    expect(result.stderr).toContain('boom');
  });

  test('times out and kills the process if npm never exits', async () => {
    jest.useFakeTimers();
    const child = makeFakeChild();
    const promise = runNpmInstall({
      collectionPath: '/c',
      packages: ['a'],
      spawnFn: () => child,
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
      collectionPath: '/c',
      packages: ['a'],
      spawnFn: () => child,
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
    const promise = runNpmInstall({ collectionPath: '/c', packages: ['a'], spawnFn: () => child });
    const err = new Error('spawn npm ENOENT');
    err.code = 'ENOENT';
    child.emit('error', err);
    child.emit('close', 1); // should be ignored

    const result = await promise;
    expect(result.errorCode).toBe('NPM_NOT_FOUND');
  });
});
