const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');
const FIXTURE_WORKSPACE = path.resolve(
  __dirname, '..', '..', '..', '..',
  'tests', 'scripting', 'additional-context-roots', 'fixtures', 'workspace'
);
// The fixture .bru files hit http://localhost:8081/ping — the Bruno testbench
// address, so the Playwright e2e can reuse the same fixture unchanged. The
// unit-test CI job doesn't start the testbench, so this suite always binds
// its own mock on that port.
const TESTBENCH_PORT = 8081;

describe('CLI run — additionalContextRoots npm module resolution', () => {
  let server;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('pong');
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(TESTBENCH_PORT, '127.0.0.1', resolve);
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-acr-'));
    fs.cpSync(FIXTURE_WORKSPACE, tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const runCli = (args, cwd) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd, env: { ...process.env } });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });

  const runOrFail = async (args, cwd) => {
    const result = await runCli(args, cwd);
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
    return result;
  };

  it('resolves an npm module from shared-scripts/node_modules when required via additionalContextRoots', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionA');
    const result = await runOrFail(
      ['run', 'happy-path.bru', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/shared utils\.js resolves signature-utils via additionalContextRoots/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('walks up from a nested shared script to find its npm dependency', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionA');
    const result = await runOrFail(
      ['run', 'nested-walkup.bru', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/nested shared util resolves signature-utils via walk-up/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);

  it('resolves the shared package from a second collection in the same workspace', async () => {
    const collDir = path.join(tmpDir, 'collections', 'collectionB');
    const result = await runOrFail(
      ['run', 'happy-path.bru', '--sandbox', 'developer', '--noproxy'],
      collDir
    );
    expect(result.stdout).toMatch(/Collection B builds a valid auth token via the shared util/);
    expect(result.stdout).not.toMatch(/failed/i);
  }, 60_000);
});
