const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const path = require('path');
const {
  echoRequest,
  startLocalServer,
  createFixtureSeeder,
  runCollection,
  readEnvironment,
  variableNames
} = require('./helpers/environments');

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
  const { seedFixture, removeSeededFixtures } = createFixtureSeeder();
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startLocalServer(echoRequest);
    baseUrl = server.baseUrl;
  });

  afterAll(() => server.close());

  afterEach(removeSeededFixtures);

  const seedCollection = (format) => seedFixture(path.join(COLLECTIONS_FIXTURE_DIR, format), `env-inheritance-${format}`);

  const environmentPath = (collectionDir, name, format) =>
    path.join(collectionDir, 'environments', `${name}.${format}`);

  // `host` carries the echo endpoint and is only declared in `base`, so a run that failed to
  // inherit could not reach the server at all. What each row resolved to is asserted by the
  // request's own `tests` block — shared with the GUI suite — and reaches here as the exit code.
  it.each([
    ['bru', 'echo.bru'],
    ['yml', 'echo.yml']
  ])('resolves the inheritance chain of the environment it runs with in a %s collection', async (format, request) => {
    const collectionDir = seedCollection(format);

    await runCollection(collectionDir, [
      'run', request,
      '--env', 'dev',
      '--env-var', `host=${baseUrl}`,
      ...envVarArgs('--env-var', COLLECTION_SECRETS)
    ]);
  }, RUN_TIMEOUT);

  // --env-file loads the file as it reads, even when the path it is given is one of the collection's
  // own environments. Nothing the parent declares reaches the run, so a script write of a name the
  // parent owns is this file's own new row rather than a value it already inherits.
  it('leaves the inheritance chain of an env file unresolved', async () => {
    const collectionDir = seedCollection('yml');

    await runCollection(collectionDir, [
      'run', 'set-env-var.yml',
      '--env-file', path.join('environments', 'scripted.yml'),
      '--env-var', `host=${baseUrl}`
    ]);

    const scripted = readEnvironment(environmentPath(collectionDir, 'scripted', 'yml'));
    expect(scripted.extends).toBe('base');
    expect(variableNames(scripted)).toEqual(['base_only', 'scripted_only', 'session_id']);
  }, RUN_TIMEOUT);

  // Global environments resolve their chain against <workspace>/environments, a separate code path
  // from the collection environments above.
  it('resolves the inheritance chain of a global environment', async () => {
    const workspaceDir = seedFixture(WORKSPACE_FIXTURE_DIR, 'env-inheritance-workspace');

    await runCollection(path.join(workspaceDir, 'collections', 'yml'), [
      'run', 'workspace-vars.yml',
      '--global-env', 'workspace_dev',
      '--workspace-path', workspaceDir,
      '--global-env-var', `workspace_host=${baseUrl}`,
      ...envVarArgs('--global-env-var', WORKSPACE_SECRETS)
    ]);
  }, RUN_TIMEOUT);

  // A script write must not fork private copies of the parent's variables into the child file:
  // they would shadow the parent from then on, and a parent secret would land as a plain row.
  it('persists only the variables a script gave a value the environment does not already inherit', async () => {
    const collectionDir = seedCollection('yml');

    await runCollection(collectionDir, ['run', 'set-env-var.yml', '--env', 'scripted', '--env-var', `host=${baseUrl}`]);

    // The script rewrote `base_only` with the value it already inherits, so that write is a no-op;
    // `session_id` differs from the parent's value and persists as an override.
    const scripted = readEnvironment(environmentPath(collectionDir, 'scripted', 'yml'));
    expect(scripted.extends).toBe('base');
    expect(variableNames(scripted)).toEqual(['scripted_only', 'session_id']);
    expect(scripted.variables.find((variable) => variable.name === 'session_id').value).toBe('script_session');
  }, RUN_TIMEOUT);
});
