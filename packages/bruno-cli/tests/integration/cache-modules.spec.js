const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const runCli = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      cwd,
      env: { ...process.env }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });

describe('CLI --cache-modules gate', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-cache-modules-'));
    fs.writeFileSync(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'cache-modules-gate', type: 'collection' })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'ping.bru'),
      `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: http://127.0.0.1:9/does-not-matter
  body: none
  auth: none
}
`
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('documents the flag in --help and marks the experimental one deprecated', async () => {
    const result = await runCli(['run', '--help']);
    expect(result.stdout).toMatch(/--cache-modules/);
    expect(result.stdout).toMatch(/developer sandbox/i);
    expect(result.stdout).toMatch(/deprecated: use --cache-modules/);
  }, 30_000);

  it('warns and ignores the flag unless --sandbox developer is set', async () => {
    const result = await runCli(
      ['run', 'ping.bru', '--cache-modules', '--sandbox', 'safe', '--noproxy'],
      tmpDir
    );
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toMatch(/--cache-modules requires --sandbox developer; ignoring flag/);
    expect(output).not.toMatch(/deprecated/);
  }, 30_000);

  it('still honors --experimental-cache-modules but logs a deprecation warning', async () => {
    const result = await runCli(
      ['run', 'ping.bru', '--experimental-cache-modules', '--sandbox', 'safe', '--noproxy'],
      tmpDir
    );
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toMatch(/--experimental-cache-modules is deprecated .* use --cache-modules instead/);
    expect(output).toMatch(/--cache-modules requires --sandbox developer; ignoring flag/);
  }, 30_000);
});
