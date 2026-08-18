const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { runCli } = require('./helpers/run-cli');
const constants = require('../../src/constants');

// An OpenCollection whose files use `.yaml` instead of `.yml`. The content is identical — only
// the extension differs — so every stage of the CLI (root detection, traversal, env lookup,
// variable persistence) has to resolve the alternate extension while still handing the `yml`
// serializer to @usebruno/filestore.

const writeFixtureFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const PING_REQUEST_YAML = `info:
  name: ping
  type: http
  seq: 1

http:
  method: GET
  url: "{{host}}/ping"

runtime:
  scripts:
    - type: after-response
      code: |-
        bru.setEnvVar("pinged", "yes");
        bru.setCollectionVar("collFlag", "on");
`;

describe('CLI run — OpenCollection collections using the .yaml extension', () => {
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bru-cli-yaml-collection-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const DEAD_HOST = 'http://127.0.0.1:1';

  const seedCollection = ({ defaultEnvironment = null } = {}) => {
    const presets = defaultEnvironment
      ? `    presets:\n      defaultEnvironment: ${defaultEnvironment}\n`
      : '';
    writeFixtureFile(
      path.join(tmpDir, 'opencollection.yaml'),
      'opencollection: 1.0.0\n'
      + 'info:\n  name: yaml-cli-collection\n'
      + 'extensions:\n  bruno:\n'
      + '    ignore:\n      - node_modules\n      - .git\n'
      + presets
      + 'request:\n  vars:\n    - name: collFlag\n      value: off\n'
    );
    writeFixtureFile(path.join(tmpDir, 'ping.yaml'), PING_REQUEST_YAML);
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'dev.yaml'),
      `name: dev\nvariables:\n  - name: host\n    value: ${baseUrl}\n`
    );
    writeFixtureFile(
      path.join(tmpDir, 'environments', 'dead.yaml'),
      `name: dead\nvariables:\n  - name: host\n    value: ${DEAD_HOST}\n`
    );
  };

  const expectSuccess = (result) => {
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
  };

  it('runs a request from a .yaml collection with --env resolving environments/<name>.yaml', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.yaml', '--env', 'dev', '--sandbox', 'developer', '--noproxy'], tmpDir);

    expectSuccess(result);
    // A 200 proves {{host}} interpolated — an unresolved placeholder yields an invalid URL.
    expect(result.stdout).toContain('ping (200 OK)');
  }, 60_000);

  it('runs the whole .yaml collection when no request path is given', async () => {
    seedCollection();

    // No path argument → the collection is traversed, which only finds ping.yaml if the
    // traversal filter accepts the .yaml extension.
    const result = await runCli(['run', '--env', 'dev', '--sandbox', 'developer', '--noproxy'], tmpDir);

    expectSuccess(result);
    expect(result.stdout).toContain('ping');
  }, 60_000);

  it('falls back to presets.defaultEnvironment resolved as environments/<name>.yaml', async () => {
    seedCollection({ defaultEnvironment: 'dev' });

    const result = await runCli(['run', 'ping.yaml', '--sandbox', 'developer', '--noproxy'], tmpDir);

    expectSuccess(result);
    expect(result.stdout).toContain('Using default environment: dev');
  }, 60_000);

  it('persists script-written env vars back into environments/<name>.yaml', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.yaml', '--env', 'dev', '--sandbox', 'developer', '--noproxy'], tmpDir);

    expectSuccess(result);
    const written = fs.readFileSync(path.join(tmpDir, 'environments', 'dev.yaml'), 'utf8');
    expect(written).toMatch(/name:\s*pinged/);
    expect(written).toMatch(/value:\s*yes/);
    // The pre-existing entry survives the rewrite.
    expect(written).toMatch(/name:\s*host/);
  }, 60_000);

  it('persists script-written collection vars back into opencollection.yaml', async () => {
    seedCollection();

    const result = await runCli(['run', 'ping.yaml', '--env', 'dev', '--sandbox', 'developer', '--noproxy'], tmpDir);

    expectSuccess(result);
    // Proves the collection root path was resolved as opencollection.yaml rather than
    // silently falling through to collection.bru.
    const written = fs.readFileSync(path.join(tmpDir, 'opencollection.yaml'), 'utf8');
    expect(written).toMatch(/name:\s*collFlag/);
    expect(written).toMatch(/value:\s*on/);
    expect(fs.existsSync(path.join(tmpDir, 'collection.bru'))).toBe(false);
  }, 60_000);

  it('resolves a --env-file with a .yaml extension', async () => {
    seedCollection();
    writeFixtureFile(
      path.join(tmpDir, 'External.yaml'),
      `name: External\nvariables:\n  - name: host\n    value: ${baseUrl}\n`
    );

    const result = await runCli(
      ['run', 'ping.yaml', '--env-file', 'External.yaml', '--sandbox', 'developer', '--noproxy'],
      tmpDir
    );

    expectSuccess(result);
    expect(result.stdout).toContain('ping (200 OK)');
    // The .yaml env file is parsed and rewritten by the yml serializer, not the bru one.
    const written = fs.readFileSync(path.join(tmpDir, 'External.yaml'), 'utf8');
    expect(written).toMatch(/name:\s*pinged/);
    expect(written).toMatch(/value:\s*yes/);
  }, 60_000);

  // The workspace marker and its global env files are resolved independently of the collection's
  // layout, so each is accepted under either extension. A workspace can therefore be all-`.yaml`,
  // all-`.yml`, or mixed.
  describe('--global-env in a workspace using the .yaml extension', () => {
    const GLOBAL_PING_REQUEST_YAML = `info:
  name: global-ping
  type: http
  seq: 1

http:
  method: GET
  url: "{{globalHost}}/ping"

runtime:
  scripts:
    - type: after-response
      code: |-
        bru.setGlobalEnvVar("globalPinged", "yes");
`;

    // `workspaceExt`/`envExt` are set per test so one tree shape covers every extension pairing.
    const stageWorkspace = ({ workspaceExt, envExt }) => {
      const workspaceDir = path.join(tmpDir, 'workspace');
      const collectionDir = path.join(workspaceDir, 'yaml-cli-collection');

      writeFixtureFile(
        path.join(workspaceDir, `workspace${workspaceExt}`),
        'opencollection: 1.0.0\n'
        + 'info:\n  name: "Test Workspace"\n  type: workspace\n'
        + 'collections:\n  - name: "yaml-cli-collection"\n    path: "yaml-cli-collection"\n'
        + 'specs:\ndocs: \'\'\n'
      );
      writeFixtureFile(
        path.join(workspaceDir, 'environments', `Global${envExt}`),
        `name: Global\nvariables:\n  - name: globalHost\n    value: ${baseUrl}\n`
      );
      writeFixtureFile(
        path.join(collectionDir, 'opencollection.yaml'),
        'opencollection: 1.0.0\ninfo:\n  name: yaml-cli-collection\n'
      );
      writeFixtureFile(path.join(collectionDir, 'global-ping.yaml'), GLOBAL_PING_REQUEST_YAML);

      return { workspaceDir, collectionDir };
    };

    it.each([
      { workspaceExt: '.yaml', envExt: '.yaml', label: 'an all-.yaml workspace' },
      { workspaceExt: '.yml', envExt: '.yaml', label: 'a .yml workspace with a .yaml global env' },
      { workspaceExt: '.yaml', envExt: '.yml', label: 'a .yaml workspace with a .yml global env' }
    ])('walks up to and loads the global env from $label', async ({ workspaceExt, envExt }) => {
      const { collectionDir } = stageWorkspace({ workspaceExt, envExt });

      // No --workspace-path: the CLI has to find the workspace marker by walking up from cwd.
      const result = await runCli(
        ['run', 'global-ping.yaml', '--global-env', 'Global', '--sandbox', 'developer', '--noproxy'],
        collectionDir
      );

      expectSuccess(result);
      // {{globalHost}} came from the global env file, so a 200 proves it was found and parsed.
      expect(result.stdout).toContain('global-ping (200 OK)');
    }, 60_000);

    it('persists script-written global env vars back into environments/Global.yaml', async () => {
      const { workspaceDir, collectionDir } = stageWorkspace({ workspaceExt: '.yaml', envExt: '.yaml' });

      const result = await runCli(
        ['run', 'global-ping.yaml', '--global-env', 'Global', '--sandbox', 'developer', '--noproxy'],
        collectionDir
      );

      expectSuccess(result);
      const written = fs.readFileSync(path.join(workspaceDir, 'environments', 'Global.yaml'), 'utf8');
      expect(written).toMatch(/name:\s*globalPinged/);
      expect(written).toMatch(/value:\s*yes/);
      // Persistence writes back to the file it resolved — it must not create a .yml sibling.
      expect(fs.existsSync(path.join(workspaceDir, 'environments', 'Global.yml'))).toBe(false);
    }, 60_000);

    it('accepts --workspace-path pointing at a .yaml workspace', async () => {
      const { workspaceDir, collectionDir } = stageWorkspace({ workspaceExt: '.yaml', envExt: '.yaml' });

      const result = await runCli(
        [
          'run', 'global-ping.yaml',
          '--global-env', 'Global',
          '--workspace-path', workspaceDir,
          '--sandbox', 'developer', '--noproxy'
        ],
        collectionDir
      );

      expectSuccess(result);
      expect(result.stdout).toContain('global-ping (200 OK)');
    }, 60_000);

    it('reports a missing global environment naming both extensions', async () => {
      const { collectionDir } = stageWorkspace({ workspaceExt: '.yaml', envExt: '.yaml' });

      const result = await runCli(
        ['run', 'global-ping.yaml', '--global-env', 'Nope', '--sandbox', 'developer', '--noproxy'],
        collectionDir
      );

      expect(result.code).toBe(constants.EXIT_STATUS.ERROR_GLOBAL_ENV_NOT_FOUND);
      expect(`${result.stdout}\n${result.stderr}`).toContain('environments/Nope.yml (or .yaml)');
    }, 60_000);
  });
});
