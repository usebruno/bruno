const { describe, it, expect, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const {
  startLocalServer,
  createFixtureSeeder,
  runCollection,
  readEnvironment,
  variableNames,
  findVariable,
  expectValueNotWritten
} = require('./helpers/environments');

const E2E_FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'tests', 'environments');

// Shared with the Playwright suites: a workspace whose environment carries a secret row, and — for
// the two-scope cases — the one that puts a collection environment in a workspace tree.
const WORKSPACE_FIXTURE_DIR = path.join(E2E_FIXTURES_DIR, 'api-setGlobalEnvVar-secret', 'fixtures', 'workspace');
const TWO_SCOPE_FIXTURE_DIR = path.join(E2E_FIXTURES_DIR, 'environment-inheritance', 'fixtures', 'workspace');

const RUN_TIMEOUT = 60_000;

const ROTATED_SECRET = 'rotated-by-the-script';

// api-setGlobalEnvVar-secret ships only a .bru collection, and the format is per-collection — so the
// run copy gets a yml one over the reused workspace, whose environments/Local.yml is what's asserted.
const YML_COLLECTION = 'opencollection: "1.0.0"\ninfo:\n  name: workspace-env-persistence\n';

const workspaceEnvRequest = (name, script) => `info:
  name: ${name}
  type: http
  seq: 10

http:
  method: GET
  url: '{{baseUrl}}/ping'

runtime:
  scripts:
    - type: after-response
      code: |-
        ${script}
`;

const WRITE_WORKSPACE_VARS = workspaceEnvRequest(
  'write-workspace-vars',
  `bru.setGlobalEnvVar('workspacePlain', 'written-by-script');\n        bru.setGlobalEnvVar('apiToken', '${ROTATED_SECRET}');`
);
const DELETE_WORKSPACE_VAR = workspaceEnvRequest('delete-workspace-var', `bru.deleteGlobalEnvVar('apiToken');`);

// Which file a script's writes land in is the contract here; override leak-guards for this scope
// live in cli-global-env-var-override.spec.js.
describe('CLI run — persisting script writes to a workspace environment', () => {
  const { seedFixture, removeSeededFixtures } = createFixtureSeeder();
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startLocalServer();
    baseUrl = server.baseUrl;
  });

  afterAll(() => server.close());

  afterEach(removeSeededFixtures);

  const seedWorkspace = () => {
    const workspaceDir = seedFixture(WORKSPACE_FIXTURE_DIR, 'workspace-env-persistence');
    const collectionDir = path.join(workspaceDir, 'collections', 'test-collection');
    fs.writeFileSync(path.join(collectionDir, 'opencollection.yml'), YML_COLLECTION);
    fs.writeFileSync(path.join(collectionDir, 'write-workspace-vars.yml'), WRITE_WORKSPACE_VARS);
    fs.writeFileSync(path.join(collectionDir, 'delete-workspace-var.yml'), DELETE_WORKSPACE_VAR);
    return { workspaceDir, collectionDir, workspaceEnvPath: path.join(workspaceDir, 'environments', 'Local.yml') };
  };

  const run = (collectionDir, workspaceDir, args) =>
    runCollection(collectionDir, [
      'run', ...args,
      '--global-env', 'Local',
      '--workspace-path', workspaceDir,
      '--global-env-var', `baseUrl=${baseUrl}`
    ]);

  it('persists a script-written workspace var into the workspace environment file', async () => {
    const { workspaceDir, collectionDir, workspaceEnvPath } = seedWorkspace();

    await run(collectionDir, workspaceDir, ['write-workspace-vars.yml']);

    expect(findVariable(readEnvironment(workspaceEnvPath), 'workspacePlain'))
      .toMatchObject({ value: 'written-by-script', enabled: true });
  }, RUN_TIMEOUT);

  it('keeps a script-written workspace secret out of the workspace environment file', async () => {
    const { workspaceDir, collectionDir, workspaceEnvPath } = seedWorkspace();

    await run(collectionDir, workspaceDir, ['write-workspace-vars.yml']);

    expect(findVariable(readEnvironment(workspaceEnvPath), 'apiToken')).toMatchObject({ secret: true });
    expectValueNotWritten(ROTATED_SECRET, [workspaceEnvPath]);
  }, RUN_TIMEOUT);

  it('drops a deleted workspace var from the workspace environment file', async () => {
    const { workspaceDir, collectionDir, workspaceEnvPath } = seedWorkspace();

    await run(collectionDir, workspaceDir, ['delete-workspace-var.yml']);

    expect(variableNames(readEnvironment(workspaceEnvPath))).toEqual(['baseUrl']);
  }, RUN_TIMEOUT);

  // The two scopes travel with the same request but in separate maps, so a write to one must reach
  // only that scope's file.
  describe('alongside a collection environment', () => {
    const seedBothScopes = () => {
      const workspaceDir = seedFixture(TWO_SCOPE_FIXTURE_DIR, 'both-scopes-env-persistence');
      const collectionDir = path.join(workspaceDir, 'collections', 'yml');
      return {
        workspaceDir,
        collectionDir,
        collectionEnvPath: path.join(collectionDir, 'environments', 'scripted.yml'),
        workspaceEnvPath: path.join(workspaceDir, 'environments', 'workspace_scripted.yml')
      };
    };

    it('sends a workspace env write to the workspace file and leaves the collection file alone', async () => {
      const { workspaceDir, collectionDir, collectionEnvPath, workspaceEnvPath } = seedBothScopes();
      const collectionEnvBefore = fs.readFileSync(collectionEnvPath, 'utf8');

      await runCollection(collectionDir, [
        'run', 'set-global-env-var.yml',
        '--env', 'scripted',
        '--global-env', 'workspace_scripted',
        '--workspace-path', workspaceDir,
        '--global-env-var', `workspace_host=${baseUrl}`
      ]);

      // `workspace_base_only` was rewritten with the value it already inherits, so only the session
      // id persists.
      expect(variableNames(readEnvironment(workspaceEnvPath)))
        .toEqual(['workspace_scripted_only', 'workspace_session_id']);
      expect(fs.readFileSync(collectionEnvPath, 'utf8')).toBe(collectionEnvBefore);
    }, RUN_TIMEOUT);

    it('sends a collection env write to the collection file and leaves the workspace file alone', async () => {
      const { workspaceDir, collectionDir, collectionEnvPath, workspaceEnvPath } = seedBothScopes();
      const workspaceEnvBefore = fs.readFileSync(workspaceEnvPath, 'utf8');

      await runCollection(collectionDir, [
        'run', 'set-env-var.yml',
        '--env', 'scripted',
        '--global-env', 'workspace_scripted',
        '--workspace-path', workspaceDir,
        '--env-var', `host=${baseUrl}`
      ]);

      expect(variableNames(readEnvironment(collectionEnvPath))).toEqual(['scripted_only', 'session_id']);
      expect(fs.readFileSync(workspaceEnvPath, 'utf8')).toBe(workspaceEnvBefore);
    }, RUN_TIMEOUT);
  });
});
