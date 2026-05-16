const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  isScriptPathSafe,
  parseEnvVarsFromOutput,
  runShellScript,
  buildSpawnArgs
} = require('../../src/utils/collection-scripts');

describe('isScriptPathSafe', () => {
  const col = '/home/user/collection';

  test('allows a relative path inside the collection', () => {
    expect(isScriptPathSafe(col, 'scripts/run.sh')).toBe(true);
  });

  test('allows a file at the collection root', () => {
    expect(isScriptPathSafe(col, 'run.sh')).toBe(true);
  });

  test('blocks single-level traversal', () => {
    expect(isScriptPathSafe(col, '../evil.sh')).toBe(false);
  });

  test('blocks traversal disguised inside a valid-looking prefix', () => {
    expect(isScriptPathSafe(col, 'scripts/../../etc/passwd')).toBe(false);
  });

  test('blocks an absolute path that escapes the collection', () => {
    expect(isScriptPathSafe(col, '/etc/passwd')).toBe(false);
  });

  test('does not accept a sibling directory that shares a name prefix', () => {
    expect(isScriptPathSafe(col, '/home/user/collection-extra/evil.sh')).toBe(false);
  });
});

describe('isScriptPathSafe — symlink escape', () => {
  let tmpRoot;
  let collectionDir;
  let outsideDir;
  let symlinkSupported = true;

  beforeAll(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-symlink-test-'));
    collectionDir = path.join(tmpRoot, 'collection');
    outsideDir = path.join(tmpRoot, 'outside');
    fs.mkdirSync(collectionDir);
    fs.mkdirSync(outsideDir);
    fs.writeFileSync(path.join(outsideDir, 'evil.sh'), '#!/bin/sh\necho pwned\n');

    try {
      fs.symlinkSync(path.join(outsideDir, 'evil.sh'), path.join(collectionDir, 'link.sh'));
    } catch (err) {
      // Windows non-admin can't create symlinks — skip rather than fail.
      symlinkSupported = false;
    }
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test('rejects a symlink inside the collection that points outside it', () => {
    if (!symlinkSupported) return;
    expect(isScriptPathSafe(collectionDir, 'link.sh')).toBe(false);
  });

  test('still accepts a real file inside the collection', () => {
    const realPath = path.join(collectionDir, 'real.sh');
    fs.writeFileSync(realPath, '#!/bin/sh\necho ok\n');
    expect(isScriptPathSafe(collectionDir, 'real.sh')).toBe(true);
  });

  test('returns false rather than throwing when the script does not exist', () => {
    expect(isScriptPathSafe(collectionDir, 'does-not-exist.sh')).toBe(false);
  });
});

describe('parseEnvVarsFromOutput', () => {
  test('parses a plain KEY=VALUE assignment', () => {
    expect(parseEnvVarsFromOutput('TOKEN=abc123')).toEqual({ TOKEN: 'abc123' });
  });

  test('parses export KEY=VALUE syntax', () => {
    expect(parseEnvVarsFromOutput('export TOKEN=abc123')).toEqual({ TOKEN: 'abc123' });
  });

  test('splits only on the first equals — values may contain =', () => {
    expect(parseEnvVarsFromOutput('KEY=a=b=c')).toEqual({ KEY: 'a=b=c' });
  });

  test('preserves spaces inside values', () => {
    expect(parseEnvVarsFromOutput('GREETING=hello world')).toEqual({ GREETING: 'hello world' });
  });

  test('accepts an empty value', () => {
    expect(parseEnvVarsFromOutput('REVOKED_TOKEN=')).toEqual({ REVOKED_TOKEN: '' });
  });

  test('ignores comment lines', () => {
    const output = '# refreshing tokens\nACCESS_TOKEN=tok_live_abc';
    expect(parseEnvVarsFromOutput(output)).toEqual({ ACCESS_TOKEN: 'tok_live_abc' });
  });

  test('ignores blank lines and surrounding whitespace', () => {
    const output = '\n  \nACCESS_TOKEN=tok_live_abc\n\n';
    expect(parseEnvVarsFromOutput(output)).toEqual({ ACCESS_TOKEN: 'tok_live_abc' });
  });

  test('ignores non-assignment lines mixed into script output', () => {
    const output = [
      'Authenticating...',
      'ACCESS_TOKEN=tok_live_abc',
      'Done.'
    ].join('\n');
    expect(parseEnvVarsFromOutput(output)).toEqual({ ACCESS_TOKEN: 'tok_live_abc' });
  });

  test('rejects keys starting with a digit', () => {
    expect(parseEnvVarsFromOutput('1INVALID=value')).toEqual({});
  });

  test('treats EXPORT as a valid key name, not a keyword', () => {
    expect(parseEnvVarsFromOutput('EXPORT=some_value')).toEqual({ EXPORT: 'some_value' });
  });

  test('handles Windows CRLF line endings', () => {
    const output = 'ACCESS_TOKEN=tok_live_abc\r\nREFRESH_TOKEN=ref_live_xyz\r\n';
    expect(parseEnvVarsFromOutput(output)).toEqual({
      ACCESS_TOKEN: 'tok_live_abc',
      REFRESH_TOKEN: 'ref_live_xyz'
    });
  });

  test('handles all forms together — comments, export prefix, noise lines, multiple vars', () => {
    const output = [
      '# setup complete',
      'export VAR_A=value_one',
      'VAR_B=value_two',
      'export VAR_C=123',
      'process finished'
    ].join('\n');

    expect(parseEnvVarsFromOutput(output)).toEqual({
      VAR_A: 'value_one',
      VAR_B: 'value_two',
      VAR_C: '123'
    });
  });

  test('last assignment wins when a key appears more than once', () => {
    const output = 'TOKEN=first\nTOKEN=second';
    expect(parseEnvVarsFromOutput(output)).toEqual({ TOKEN: 'second' });
  });
});

describe('buildSpawnArgs', () => {
  const cwd = '/some/collection';
  const script = '/some/collection/run.sh';

  test('on darwin, spawns the script directly without a shell', () => {
    const { command, args, options } = buildSpawnArgs(script, cwd, 'darwin');
    expect(command).toBe(script);
    expect(args).toEqual([]);
    expect(options.cwd).toBe(cwd);
    expect(options.shell).toBeFalsy();
  });

  test('on linux, spawns the script directly without a shell', () => {
    const { options } = buildSpawnArgs(script, cwd, 'linux');
    expect(options.shell).toBeFalsy();
  });

  test('on win32, runs through a shell so file associations and .cmd/.bat work', () => {
    const { command, options } = buildSpawnArgs(script, cwd, 'win32');
    expect(command).toBe(script);
    expect(options.shell).toBe(true);
    expect(options.windowsHide).toBe(true);
  });

  test('passes cwd and env through to spawn options', () => {
    const { options } = buildSpawnArgs(script, cwd, 'linux');
    expect(options.cwd).toBe(cwd);
    expect(options.env).toBe(process.env);
  });
});

describe('runShellScript streaming', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-script-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Cross-platform: shebang dispatches to whatever `node` is on PATH (POSIX).
  // On Windows, runShellScript uses shell:true so the .js extension routes to
  // the Node file association. We additionally write a `.cmd` shim there.
  const writeNodeScript = (filename, jsBody) => {
    const fullPath = path.join(tmpDir, filename);
    fs.writeFileSync(fullPath, `#!/usr/bin/env node\n${jsBody}\n`, { mode: 0o755 });
    return filename;
  };

  test('invokes onStdout with chunks that together equal the captured stdout', async () => {
    const file = writeNodeScript(
      'hello.js',
      `console.log('first'); setTimeout(() => console.log('second'), 50);`
    );
    const chunks = [];
    const result = await runShellScript(tmpDir, file, {
      onStdout: (chunk) => chunks.push(chunk)
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toBe(result.stdout);
    expect(result.stdout).toContain('first');
    expect(result.stdout).toContain('second');
    expect(result.exitCode).toBe(0);
  });

  test('invokes onStderr for stderr output', async () => {
    const file = writeNodeScript(
      'err.js',
      `console.error('oops'); process.exit(3);`
    );
    const stderrChunks = [];
    const result = await runShellScript(tmpDir, file, {
      onStderr: (chunk) => stderrChunks.push(chunk)
    });

    expect(stderrChunks.join('')).toContain('oops');
    expect(result.exitCode).toBe(3);
  });

  test('works without callbacks (preserves existing call sites)', async () => {
    const file = writeNodeScript('plain.js', `console.log('ok');`);
    const result = await runShellScript(tmpDir, file);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  test('truncates stdout when it exceeds maxBuffer and marks truncated=true', async () => {
    // Emit ~5KB to stdout with maxBuffer=512 — must cap and mark truncated.
    const file = writeNodeScript(
      'flood.js',
      `for (let i = 0; i < 50; i++) console.log('x'.repeat(100));`
    );
    const result = await runShellScript(tmpDir, file, { maxBuffer: 512 });

    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(512 + 200); // 200 = headroom for truncation marker
    expect(result.stdout).toMatch(/truncated/i);
  });

  test('does not mark truncated when output stays within maxBuffer', async () => {
    const file = writeNodeScript('tiny.js', `console.log('hi');`);
    const result = await runShellScript(tmpDir, file, { maxBuffer: 1024 });
    expect(result.truncated).toBeFalsy();
    expect(result.stdout).toContain('hi');
  });
});
