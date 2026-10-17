const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const PING_REQUEST_BRU = `meta {
  name: ping
  type: http
  seq: 1
}

get {
  url: {{host}}/ping
  body: none
  auth: none
}
`;

describe('CLI run - default environment fallback (presets.defaultEnvironment)', () => {
  let server;
  let baseUrl;
  let tmpDir;

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-default-env-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const runCli = (args, cwd = tmpDir) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [CLI_BIN, ...args], { cwd, env: { ...process.env } });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });

  const DEAD_HOST = 'http://127.0.0.1:1';

  const seedCollection = ({ prodHost = baseUrl, devHost = DEAD_HOST } = {}) => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify(
        { version: '1', name: 'default-env-cli', type: 'collection', presets: { defaultEnvironment: 'prod' } },
        null,
        2
      ) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: default-env-cli\n  seq: 1\n}\n');
    writeFixtureFile(path.join(tmpDir, 'environments', 'prod.bru'), `vars {\n  host: ${prodHost}\n}\n`);
    writeFixtureFile(path.join(tmpDir, 'environments', 'dev.bru'), `vars {\n  host: ${devHost}\n}\n`);
    writeFixtureFile(path.join(tmpDir, 'ping.bru'), PING_REQUEST_BRU);
  };

  it('uses presets.defaultEnvironment when no --env is provided', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.bru', '--sandbox', 'developer', '--noproxy']);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // The default environment (prod) resolved {{host}} to the live server.
    expect(result.stdout).toContain('Using default environment: prod');
  }, 60_000);

  it('honors --env over the configured default and skips the default fallback', async () => {
    // Default is "prod" but it points at a dead port; "dev" points at the live server.
    // A passing run proves the explicit --env dev won over the configured default.
    seedCollection({ prodHost: DEAD_HOST, devHost: baseUrl });

    const result = await runCli(['run', 'ping.bru', '--env', 'dev', '--sandbox', 'developer', '--noproxy']);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // Explicit --env skips the default fallback entirely, so the fallback log must not appear.
    expect(result.stdout).not.toContain('Using default environment');
  }, 60_000);

  it('warns but still runs when the configured default environment file is missing', async () => {
    writeFixtureFile(
      path.join(tmpDir, 'bruno.json'),
      JSON.stringify(
        { version: '1', name: 'default-env-cli', type: 'collection', presets: { defaultEnvironment: 'prod' } },
        null,
        2
      ) + '\n'
    );
    writeFixtureFile(path.join(tmpDir, 'collection.bru'), 'meta {\n  name: default-env-cli\n  seq: 1\n}\n');
    // environments/prod.bru is intentionally NOT created. The request uses an absolute URL
    // so it can run without any environment loaded.
    writeFixtureFile(
      path.join(tmpDir, 'ping.bru'),
      `meta {\n  name: ping\n  type: http\n  seq: 1\n}\n\nget {\n  url: ${baseUrl}/ping\n  body: none\n  auth: none\n}\n`
    );

    const result = await runCli(['run', 'ping.bru', '--sandbox', 'developer', '--noproxy']);

    // A missing configured default is a soft warning, not a hard error - the run still succeeds.
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    expect(`${result.stdout}\n${result.stderr}`).toContain('Configured default environment not found');
  }, 60_000);
});
