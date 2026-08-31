const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { parseEnvironment } = require('@usebruno/filestore');
const { runCli } = require('./helpers/run-cli');
const { copyFixtureToTmpDir, removeTmpDir } = require('./helpers/tmp-dir');

const WORKSPACE_FIXTURE_DIR = path.resolve(
  __dirname,
  '..', '..', '..', '..',
  'tests', 'environments', 'environment-inheritance', 'fixtures', 'workspace'
);
const COLLECTIONS_FIXTURE_DIR = path.join(WORKSPACE_FIXTURE_DIR, 'collections');

const RUN_TIMEOUT = 60_000;

const COLLECTION_SECRETS = {
  base_token: 'token-from-base',
  overridden_plain: 'secret-from-dev',
  overridden_secret: 'secret-from-base'
};

const WORKSPACE_SECRETS = {
  workspace_token: 'token-from-workspace-base',
  workspace_overridden_plain: 'secret-from-workspace-dev',
  workspace_overridden_secret: 'secret-from-workspace-base'
};

const envVarArgs = (flag, secrets) =>
  Object.entries(secrets).flatMap(([name, value]) => [flag, `${name}=${value}`]);

describe('CLI run - environment inheritance (extends)', () => {
  let server;
  let baseUrl;
  let tmpDirs = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  afterEach(() => {
    tmpDirs.forEach(removeTmpDir);
    tmpDirs = [];
  });

  // A run rewrites the environment files it is pointed at, so it never sees the committed fixture.
  const seedFixture = (fixtureDir, tag) => {
    const tmpDir = copyFixtureToTmpDir(fixtureDir, tag);
    tmpDirs.push(tmpDir);
    return tmpDir;
  };

  const seedCollection = (format) => seedFixture(path.join(COLLECTIONS_FIXTURE_DIR, format), `env-inheritance-${format}`);

  const assertSucceeded = (result) => {
    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
  };

  const readEnvironment = (collectionDir, name, format) =>
    parseEnvironment(fs.readFileSync(path.join(collectionDir, 'environments', `${name}.${format}`), 'utf8'), { format });

  const variableNames = (environment) => environment.variables.map((variable) => variable.name).sort();

  // `host` carries the echo endpoint and is only declared in `base`, so a run that failed to
  // inherit could not reach the server at all. What each row resolved to is asserted by the
  // request's own `tests` block — shared with the GUI suite — and reaches here as the exit code.
  it.each([
    ['bru', 'echo.bru'],
    ['yml', 'echo.yml']
  ])('resolves the inheritance chain of the environment it runs with in a %s collection', async (format, request) => {
    const collectionDir = seedCollection(format);

    const result = await runCli(
      [
        'run', request,
        '--env', 'dev',
        '--env-var', `host=${baseUrl}`,
        ...envVarArgs('--env-var', COLLECTION_SECRETS),
        '--sandbox', 'developer', '--noproxy'
      ],
      collectionDir
    );

    assertSucceeded(result);
  }, RUN_TIMEOUT);

  // Global environments resolve their chain against <workspace>/environments, a separate code path
  // from the collection environments above.
  it('resolves the inheritance chain of a global environment', async () => {
    const workspaceDir = seedFixture(WORKSPACE_FIXTURE_DIR, 'env-inheritance-workspace');

    const result = await runCli(
      [
        'run', 'workspace-vars.yml',
        '--global-env', 'workspace_dev',
        '--workspace-path', workspaceDir,
        '--global-env-var', `workspace_host=${baseUrl}`,
        ...envVarArgs('--global-env-var', WORKSPACE_SECRETS),
        '--sandbox', 'developer', '--noproxy'
      ],
      path.join(workspaceDir, 'collections', 'yml')
    );

    assertSucceeded(result);
  }, RUN_TIMEOUT);

  // A script write must not fork private copies of the parent's variables into the child file:
  // they would shadow the parent from then on, and a parent secret would land as a plain row.
  it('persists only the variables a script gave a value the environment does not already inherit', async () => {
    const collectionDir = seedCollection('yml');

    const result = await runCli(
      ['run', 'set-env-var.yml', '--env', 'scripted', '--env-var', `host=${baseUrl}`, '--sandbox', 'developer', '--noproxy'],
      collectionDir
    );

    assertSucceeded(result);
    // The script rewrote `base_only` with the value it already inherits, so that write is a no-op;
    // `session_id` differs from the parent's value and persists as an override.
    const scripted = readEnvironment(collectionDir, 'scripted', 'yml');
    expect(scripted.extends).toBe('base');
    expect(variableNames(scripted)).toEqual(['scripted_only', 'session_id']);
    expect(scripted.variables.find((variable) => variable.name === 'session_id').value).toBe('script_session');
  }, RUN_TIMEOUT);
});
