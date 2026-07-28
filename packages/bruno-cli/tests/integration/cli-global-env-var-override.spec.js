const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const yaml = require('js-yaml');
const { bruToEnvJsonV2 } = require('@usebruno/lang');
const { runCli } = require('./helpers/run-cli');

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const workspaceYml = (collectionName) =>
  `opencollection: 1.0.0\ninfo:\n  name: "Test Workspace"\n  type: workspace\ncollections:\n  - name: "${collectionName}"\n    path: "${collectionName}"\nspecs:\ndocs: ''\n`;

const globalEnvYml = (vars) =>
  `name: Global\nvariables:\n`
  + vars.map(([name, value]) => `  - name: ${name}\n    value: ${value}\n`).join('');

// Covers the --global-env-var CLI flag end-to-end: argument validation (rejects malformed
// name=value) and the leak-guard that keeps injected values out of the on-disk global env file.
// The persistence-layer unit for this lives in tests/utils/persist-variables.spec.js.
// Collections are written inline into a fresh temp dir per test — the mock server's port is
// random per run, so `baseUrl` has to be interpolated at write time.
describe('CLI run — --global-env-var overrides', () => {
  let server;
  let baseUrl;
  let tmpDir;
  let receivedUrl; // request path the mock server saw this test (one request per run) — lets us assert what reached the run

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedUrl = req.url; // requests interpolate override values into the query string
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

  // Global env vars live in the workspace, not the collection — the CLI walks up from cwd looking
  // for workspace.yml, so the collection must sit inside the workspace dir. Shared by the two
  // tests below, which need an identical tree.
  const stageLeakCollection = () => {
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(workspaceDir, 'override-leak-collection');

    writeFixtureFile(path.join(workspaceDir, 'workspace.yml'), workspaceYml('override-leak-collection'));
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      globalEnvYml([['baseUrl', baseUrl], ['token', 'real-global-secret']])
    );
    writeFixtureFile(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'override-leak-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: override-leak-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'echo-global-token.bru'),
      `meta {
  name: echo-global-token
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/ping?token={{token}}
  body: none
  auth: none
}

script:post-response {
  // Echo the override back to force a full-env write attempt, and make a genuine
  // (non-override) write that SHOULD persist to the global env file.
  bru.setGlobalEnvVar("token", bru.getGlobalEnvVar("token"));
  bru.setGlobalEnvVar("persistedByScript", "kept-on-disk");
}
`
    );

    return { workspaceDir, collectionDir };
  };

  // --global-env-var mirrors --env-var but targets the workspace's global env file. The
  // injected value must reach the run (proving the override applied) yet never overwrite the
  // real secret in <workspace>/environments/<name>.yml.
  it('does not persist --global-env-var override values into the global env file', async () => {
    const { workspaceDir, collectionDir } = stageLeakCollection();

    const result = await runCli([
      'run', 'echo-global-token.bru',
      '--global-env', 'Global',
      '--global-env-var', 'token=transient-cli-value',
      '--sandbox', 'developer',
      '--noproxy'
    ], collectionDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }

    // check for runtime override value in the request url
    expect(receivedUrl).toContain('token=transient-cli-value');
    expect(receivedUrl).not.toContain('real-global-secret');

    // Global env on disk: real secret survives and genuine writes persist, override never lands
    const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
    expect(written).not.toContain('transient-cli-value'); // transient override never touches disk

    const varsByName = Object.fromEntries(yaml.load(written).variables.map((v) => [v.name, v.value]));
    expect(varsByName.token).toBe('real-global-secret');
    expect(varsByName.persistedByScript).toBe('kept-on-disk');
  }, 60_000);

  // A --global-env-var value with no `=` is malformed and must abort with
  // ERROR_INCORRECT_ENV_OVERRIDE (8) rather than silently swallowing it.
  // Validation aborts before the request executes, so the leak collection is reused as-is.
  it('exits with an error when --global-env-var value is malformed (no name=value)', async () => {
    const { collectionDir } = stageLeakCollection();

    const result = await runCli([
      'run', 'echo-global-token.bru',
      '--global-env', 'Global',
      '--global-env-var', 'token',
      '--sandbox', 'developer',
      '--noproxy'
    ], collectionDir);

    expect(result.code).toBe(8);
    expect(result.stderr).toContain('Overridable global environment variable not correct');
  }, 60_000);

  // Multiple --env-var AND multiple --global-env-var usages accumulate (yargs collects repeats
  // into an array — the Array.isArray branch in run.js). Every override applies during the run
  // and the leak-guard keeps all injected values off disk, independently for each scope, while
  // deliberate unrelated writes in both scopes still persist.
  it('applies multiple --env-var and --global-env-var overrides without leaking either scope to disk', async () => {
    const workspaceDir = path.join(tmpDir, 'workspace');
    const collectionDir = path.join(workspaceDir, 'multi-override-collection');

    writeFixtureFile(path.join(workspaceDir, 'workspace.yml'), workspaceYml('multi-override-collection'));
    writeFixtureFile(
      path.join(workspaceDir, 'environments', 'Global.yml'),
      globalEnvYml([['baseUrl', baseUrl], ['token', 'real-token'], ['region', 'us']])
    );
    writeFixtureFile(
      path.join(collectionDir, 'bruno.json'),
      JSON.stringify({ version: '1', name: 'multi-override-collection', type: 'collection' }, null, 2) + '\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'collection.bru'),
      'meta {\n  name: multi-override-collection\n  seq: 1\n}\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'environments', 'Local.bru'),
      'vars {\n  apiKey: real-api-key\n  stage: prod\n}\n'
    );
    writeFixtureFile(
      path.join(collectionDir, 'echo-globals.bru'),
      `meta {
  name: echo-globals
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/ping?token={{token}}&region={{region}}&apiKey={{apiKey}}&stage={{stage}}
  body: none
  auth: none
}

script:post-response {
  // Echo both scopes back to force full-env write attempts, plus a deliberate unrelated write
  // in each scope that must persist.
  bru.setGlobalEnvVar("token", bru.getGlobalEnvVar("token"));
  bru.setGlobalEnvVar("region", bru.getGlobalEnvVar("region"));
  bru.setGlobalEnvVar("globalUnrelated", "global-kept");

  bru.setEnvVar("apiKey", bru.getEnvVar("apiKey"));
  bru.setEnvVar("stage", bru.getEnvVar("stage"));
  bru.setEnvVar("localUnrelated", "local-kept");
}
`
    );

    const result = await runCli([
      'run', 'echo-globals.bru',
      '--env', 'Local',
      '--env-var', 'apiKey=transient-api-key',
      '--env-var', 'stage=transient-stage',
      '--global-env', 'Global',
      '--global-env-var', 'token=transient-token',
      '--global-env-var', 'region=eu-transient',
      '--sandbox', 'developer',
      '--noproxy'
    ], collectionDir);

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
    const globalWritten = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yml'), 'utf8');
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
