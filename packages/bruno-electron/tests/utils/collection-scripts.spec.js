const fs = require('fs');
const os = require('os');
const path = require('path');
const { isScriptPathSafe, parseEnvVarsFromOutput, runShellScript } = require('../../src/utils/collection-scripts');

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
    // Without the path.sep suffix, /home/user/collection-extra/evil.sh would
    // pass startsWith('/home/user/collection') — the sep prevents that.
    expect(isScriptPathSafe(col, '/home/user/collection-extra/evil.sh')).toBe(false);
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
    // All-caps EXPORT should be parsed as a key, not stripped as a shell keyword
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

describe('runShellScript streaming', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-script-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeScript = (filename, body) => {
    const fullPath = path.join(tmpDir, filename);
    fs.writeFileSync(fullPath, body, { mode: 0o755 });
    return filename;
  };

  test('invokes onStdout with chunks that together equal the captured stdout', async () => {
    const file = writeScript('hello.sh', '#!/bin/bash\necho first\nsleep 0.05\necho second\n');
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
    const file = writeScript('err.sh', '#!/bin/bash\necho oops 1>&2\nexit 3\n');
    const stderrChunks = [];
    const result = await runShellScript(tmpDir, file, {
      onStderr: (chunk) => stderrChunks.push(chunk)
    });

    expect(stderrChunks.join('')).toContain('oops');
    expect(result.exitCode).toBe(3);
  });

  test('works without callbacks (preserves existing call sites)', async () => {
    const file = writeScript('plain.sh', '#!/bin/bash\necho ok\n');
    const result = await runShellScript(tmpDir, file);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
  });
});
