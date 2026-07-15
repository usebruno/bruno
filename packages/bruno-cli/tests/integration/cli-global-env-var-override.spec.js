const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { bruToEnvJsonV2 } = require('@usebruno/lang');

const CLI_BIN = path.resolve(__dirname, '..', '..', 'bin', 'bru.js');
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'cli-global-env-var-override');

// Covers the --global-env-var CLI flag end-to-end: argument validation (requires --global-env,
// rejects malformed values) and the leak-guard that keeps injected values out of the on-disk
// global env file. The persistence-layer unit for this lives in tests/utils/persist-variables.spec.js.
describe('CLI run — --global-env-var overrides', () => {
  let server;
  let baseUrl;
  let tmpDir;
  let receivedUrl; // request path the mock server saw this test (one request per run) — lets us assert what reached the run

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedUrl = req.url; // fixtures interpolate override values into the query string
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-global-env-var-'));
    receivedUrl = undefined;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Recursively traverse the provided directory, identifying all files.
  // For each file, replace every instance of the placeholder `{{BASE_URL}}`
  // with the actual live server URL (`baseUrl`). This ensures that all fixtures
  // reference the dynamic test HTTP server, enabling isolation and deterministic integration tests.
  const substituteBaseUrl = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        substituteBaseUrl(full);
      } else {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('{{BASE_URL}}')) {
          fs.writeFileSync(full, content.split('{{BASE_URL}}').join(baseUrl));
        }
      }
    }
  };

  // Fixtures are static on disk but the mock server's port is random per run. Copy the named
  // scenario into a fresh temp dir (so the test can mutate it) and substitute {{BASE_URL}} in
  // text files with the live server URL.
  const stageFixture = (scenario) => {
    const src = path.join(FIXTURES_DIR, scenario); // get the path of the fixture
    const dest = path.join(tmpDir, scenario); // get the path of the temp dir
    fs.cpSync(src, dest, { recursive: true }); // copy the fixture to the temp dir
    substituteBaseUrl(dest); // substitute the {{BASE_URL}} with the live server URL
    return dest;
  };

  // spawnSync blocks jest's event loop, starving the in-process HTTP server → ECONNREFUSED.
  // Use async spawn so the server stays responsive.
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

  // --global-env-var mirrors --env-var but targets the workspace's global env file. The
  // injected value must reach the run (proving the override applied) yet never overwrite the
  // real secret in <workspace>/environments/<name>.yml.
  it('does not persist --global-env-var override values into the global env file', async () => {
    const root = stageFixture('leak');
    const collectionDir = path.join(root, 'workspace', 'override-leak-collection');

    const result = await runCli(
      [
        'run', 'echo-global-token.bru',
        '--global-env', 'Global',
        '--global-env-var', 'token=transient-cli-value',
        '--sandbox', 'developer',
        '--noproxy'
      ],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // check for runtime override value in the request url
    expect(receivedUrl).toContain('token=transient-cli-value');
    expect(receivedUrl).not.toContain('real-global-secret');

    // Global env on disk: real secret survives and genuine writes persist, override never lands
    const written = fs.readFileSync(path.join(root, 'workspace', 'environments', 'Global.yml'), 'utf8');
    expect(written).not.toContain('transient-cli-value'); // transient override never touches disk

    const varsByName = Object.fromEntries(yaml.load(written).variables.map((v) => [v.name, v.value]));
    expect(varsByName.token).toBe('real-global-secret');
    expect(varsByName.persistedByScript).toBe('kept-on-disk');
  }, 60_000);

  // --global-env-var is meaningless without a loaded global environment; the guard rejects it
  // up front with ERROR_INCORRECT_ENV_OVERRIDE (8).
  it('exits with an error when --global-env-var is passed without --global-env', async () => {
    const root = stageFixture('no-global-env');

    const result = await runCli(
      [
        'run', 'ping.bru',
        '--env', 'Test',
        '--global-env-var', 'token=xxx',
        '--sandbox', 'developer',
        '--noproxy'
      ],
      root
    );

    expect(result.code).toBe(8);
    expect(result.stderr).toContain('--global-env-var requires --global-env to be set');
  }, 60_000);

  // A --global-env-var value with no `=` is malformed and must abort with
  // ERROR_INCORRECT_ENV_OVERRIDE (8) rather than silently swallowing it.
  it('exits with an error when --global-env-var value is malformed (no name=value)', async () => {
    const root = stageFixture('malformed');
    const collectionDir = path.join(root, 'workspace', 'malformed-collection');

    const result = await runCli(
      [
        'run', 'ping.bru',
        '--global-env', 'Global',
        '--global-env-var', 'token',
        '--sandbox', 'developer',
        '--noproxy'
      ],
      collectionDir
    );

    expect(result.code).toBe(8);
    expect(result.stderr).toContain('Overridable global environment variable not correct');
  }, 60_000);

  // Multiple --env-var AND multiple --global-env-var usages accumulate (yargs collects repeats
  // into an array — the Array.isArray branch in run.js). Every override applies during the run
  // and the leak-guard keeps all injected values off disk, independently for each scope, while
  // deliberate unrelated writes in both scopes still persist.
  it('applies multiple --env-var and --global-env-var overrides without leaking either scope to disk', async () => {
    const root = stageFixture('multi');
    const collectionDir = path.join(root, 'workspace', 'multi-override-collection');

    const result = await runCli(
      [
        'run', 'echo-globals.bru',
        '--env', 'Local',
        '--env-var', 'apiKey=transient-api-key',
        '--env-var', 'stage=transient-stage',
        '--global-env', 'Global',
        '--global-env-var', 'token=transient-token',
        '--global-env-var', 'region=eu-transient',
        '--sandbox', 'developer',
        '--noproxy'
      ],
      collectionDir
    );

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // Runtime request url: both local and global overrides are applied
    expect(receivedUrl).toContain('token=transient-token');
    expect(receivedUrl).toContain('region=eu-transient');
    expect(receivedUrl).toContain('apiKey=transient-api-key');
    expect(receivedUrl).toContain('stage=transient-stage');

    // Global env on disk: real values survive and genuine writes persist, overrides never land
    const globalWritten = fs.readFileSync(path.join(root, 'workspace', 'environments', 'Global.yml'), 'utf8');
    const globalVars = Object.fromEntries(yaml.load(globalWritten).variables.map((v) => [v.name, v.value]));
    expect(globalVars.token).toBe('real-token'); // real secret kept
    expect(globalVars.region).toBe('us'); // real value kept
    expect(globalVars.globalUnrelated).toBe('global-kept'); // genuine (non-override) write persists
    expect(globalWritten).not.toContain('transient-token'); // injected override never touches disk
    expect(globalWritten).not.toContain('eu-transient');

    // Local env on disk: real values survive and genuine writes persist, overrides never land
    const localWritten = fs.readFileSync(path.join(collectionDir, 'environments', 'Local.bru'), 'utf8');
    const localVars = Object.fromEntries(bruToEnvJsonV2(localWritten).variables.map((v) => [v.name, v.value]));
    expect(localVars.apiKey).toBe('real-api-key'); // real secret kept
    expect(localVars.stage).toBe('prod'); // real value kept
    expect(localVars.localUnrelated).toBe('local-kept'); // genuine (non-override) write persists
    expect(localWritten).not.toContain('transient-api-key'); // injected override never touches disk
    expect(localWritten).not.toContain('transient-stage');
  }, 60_000);
});
