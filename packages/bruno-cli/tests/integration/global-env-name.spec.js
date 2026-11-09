const { describe, it, beforeAll, afterAll, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { runCli } = require('./helpers/run-cli');
const { startLocalServer, createFixtureSeeder } = require('./helpers/environments');

const E2E_FIXTURES_DIR = path.resolve(__dirname, '..', '..', '..', '..', 'tests', 'environments');

// A workspace that puts a collection environment (`scripted`) alongside a workspace one
// (`workspace_scripted`), so the two names can be told apart.
const TWO_SCOPE_FIXTURE_DIR = path.join(E2E_FIXTURES_DIR, 'environment-inheritance', 'fixtures', 'workspace');

const RUN_TIMEOUT = 60_000;

const SANDBOXES = ['safe', 'developer'];

const request = (name, tests) => `info:
  name: ${name}
  type: http
  seq: 20

http:
  method: GET
  url: '{{baseUrl}}/ping'
  auth: none

runtime:
  scripts:
    - type: tests
      code: |-
        ${tests}
`;

// The app hands the name down on its own field while `bru run` carries it in-band as
// globalEnvironmentVariables.__name__ — these assertions are what keeps the two runtimes
// answering the same thing.
describe('CLI run — bru.getGlobalEnvName()', () => {
  const { seedFixture, removeSeededFixtures } = createFixtureSeeder();
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startLocalServer();
    baseUrl = server.baseUrl;
  });

  afterAll(() => server.close());

  afterEach(removeSeededFixtures);

  const seedCollection = (name, tests) => {
    const workspaceDir = seedFixture(TWO_SCOPE_FIXTURE_DIR, 'global-env-name');
    const collectionDir = path.join(workspaceDir, 'collections', 'yml');
    fs.writeFileSync(path.join(collectionDir, `${name}.yml`), request(name, tests));
    return { workspaceDir, collectionDir };
  };

  const run = async (name, tests, { sandbox, args = [] }) => {
    const { workspaceDir, collectionDir } = seedCollection(name, tests);
    const result = await runCli([
      'run', `${name}.yml`,
      '--workspace-path', workspaceDir,
      '--global-env-var', `baseUrl=${baseUrl}`,
      '--sandbox', sandbox,
      '--noproxy',
      ...args
    ], collectionDir);

    if (result.code !== 0) {
      throw new Error(
        `CLI exited with code ${result.code}.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`
      );
    }
  };

  SANDBOXES.forEach((sandbox) => {
    describe(`${sandbox} sandbox`, () => {
      it('returns the name of the environment --global-env selected', async () => {
        await run(
          'global-env-name',
          `test("reports the active global environment", function() {
          expect(bru.getGlobalEnvName()).to.equal("workspace_scripted");
        });`,
          { sandbox, args: ['--global-env', 'workspace_scripted'] }
        );
      }, RUN_TIMEOUT);

      it('is independent of the collection environment name', async () => {
        await run(
          'both-env-names',
          `test("reports each scope's own name", function() {
          expect(bru.getEnvName()).to.equal("scripted");
          expect(bru.getGlobalEnvName()).to.equal("workspace_scripted");
        });`,
          { sandbox, args: ['--env', 'scripted', '--global-env', 'workspace_scripted'] }
        );
      }, RUN_TIMEOUT);

      it('returns undefined when no global environment is selected', async () => {
        await run(
          'no-global-env-name',
          `test("reports no global environment", function() {
          expect(bru.getGlobalEnvName()).to.equal(undefined);
        });`,
          { sandbox }
        );
      }, RUN_TIMEOUT);

      it('keeps the name out of the global variables the script can read', async () => {
        await run(
          'global-env-name-reserved',
          `test("__name__ is metadata, not a variable", function() {
          expect(bru.getAllGlobalEnvVars()).to.not.have.property("__name__");
          expect(bru.hasGlobalEnvVar("__name__")).to.equal(false);
          expect(bru.getGlobalEnvVar("__name__")).to.equal(undefined);
        });`,
          { sandbox, args: ['--global-env', 'workspace_scripted'] }
        );
      }, RUN_TIMEOUT);
    });
  });
});
