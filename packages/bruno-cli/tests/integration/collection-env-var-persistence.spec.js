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

// Shared with the Playwright suite: a yml collection whose environment carries a secret row.
const COLLECTION_FIXTURE_DIR = path.resolve(
  __dirname,
  '..', '..', '..', '..',
  'tests', 'environments', 'api-setEnvVar-secret', 'fixtures', 'collections', 'yml'
);

const RUN_TIMEOUT = 60_000;

const ENV_FILE_SECRET = 'secret-declared-in-env-file';
const ROTATED_SECRET = 'rotated-by-the-script';
// The value set-secret.yml writes to the `apiToken` row the fixture's environment declares secret.
const FIXTURE_ENVIRONMENT_SECRET = 'NEW_VALUE_collection_env_e2e_42';

// Its secret row carries no value, the way an environment file on disk never should; the run
// supplies one with `--env-var`, as CI does for a secret the CLI cannot decrypt at rest.
const ENV_FILE = {
  name: 'EnvFile',
  variables: [
    { name: 'envFilePlain', value: 'from-env-file', enabled: true, secret: false },
    { name: 'envFileToken', value: '', enabled: true, secret: true }
  ]
};

const REWRITE_ENV_FILE_VARS = `info:
  name: rewrite-env-file-vars
  type: http
  seq: 10

http:
  method: GET
  url: '{{baseUrl}}/ping'

runtime:
  scripts:
    - type: after-response
      code: |-
        bru.setEnvVar('envFilePlain', 'rewritten');
        bru.setEnvVar('envFileToken', '${ROTATED_SECRET}');
`;

// Which file a script's writes land in is the contract here; what gets written into it (data types,
// --env-var leak-guards) is covered by run-typed-persistence.spec.js.
describe('CLI run — persisting script writes to a collection environment', () => {
  const { seedFixture, removeSeededFixtures } = createFixtureSeeder();
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startLocalServer();
    baseUrl = server.baseUrl;
  });

  afterAll(() => server.close());

  afterEach(removeSeededFixtures);

  const seedCollection = () => {
    const collectionDir = seedFixture(COLLECTION_FIXTURE_DIR, 'collection-env-persistence');
    const envFilePath = path.join(collectionDir, 'env-file.json');
    fs.writeFileSync(envFilePath, JSON.stringify(ENV_FILE, null, 2) + '\n');
    fs.writeFileSync(path.join(collectionDir, 'rewrite-env-file-vars.yml'), REWRITE_ENV_FILE_VARS);
    return { collectionDir, localEnvPath: path.join(collectionDir, 'environments', 'Local.yml'), envFilePath };
  };

  // `baseUrl` is an override so the run reaches the local server; the leak-guard keeps both it and
  // the injected secret off disk.
  const run = (collectionDir, args) =>
    runCollection(collectionDir, [
      'run', ...args,
      '--env-var', `baseUrl=${baseUrl}`,
      '--env-var', `envFileToken=${ENV_FILE_SECRET}`
    ]);

  it('keeps a script-written secret out of the environment file', async () => {
    const { collectionDir, localEnvPath } = seedCollection();

    await run(collectionDir, ['set-secret.yml', '--env', 'Local']);

    expect(findVariable(readEnvironment(localEnvPath), 'apiToken')).toMatchObject({ secret: true });
    expectValueNotWritten(FIXTURE_ENVIRONMENT_SECRET, [localEnvPath]);
  }, RUN_TIMEOUT);

  describe('with an --env-file alongside --env', () => {
    // Both files feed one runtime map, but only the --env file is written back. Copying the other
    // file's names into it forks rows that shadow it from then on — and a json env file's secrets
    // carry inline values, so the copy would put one on disk, and in git, in cleartext.
    it('leaves the --env-file variables out of the --env file when a script writes another var', async () => {
      const { collectionDir, localEnvPath } = seedCollection();

      await run(collectionDir, ['set-secret.yml', '--env', 'Local', '--env-file', 'env-file.json']);

      expect(variableNames(readEnvironment(localEnvPath))).toEqual(['apiToken', 'baseUrl']);
      expectValueNotWritten(ENV_FILE_SECRET, [localEnvPath]);
    }, RUN_TIMEOUT);

    it('does not write back to the --env-file itself', async () => {
      const { collectionDir, envFilePath } = seedCollection();
      const before = fs.readFileSync(envFilePath, 'utf8');

      await run(collectionDir, ['set-secret.yml', '--env', 'Local', '--env-file', 'env-file.json']);

      expect(fs.readFileSync(envFilePath, 'utf8')).toBe(before);
    }, RUN_TIMEOUT);

    it('persists a rewritten --env-file variable into the --env file as an override', async () => {
      const { collectionDir, localEnvPath } = seedCollection();

      await run(collectionDir, ['rewrite-env-file-vars.yml', '--env', 'Local', '--env-file', 'env-file.json']);

      expect(findVariable(readEnvironment(localEnvPath), 'envFilePlain'))
        .toMatchObject({ value: 'rewritten', enabled: true });
    }, RUN_TIMEOUT);

    // The forked override row takes its secret flag from the file that declared the name; written
    // as a plain row instead, the rotated value would land in the --env file in cleartext.
    it('persists a rewritten --env-file secret as a secret, keeping its value off disk', async () => {
      const { collectionDir, localEnvPath, envFilePath } = seedCollection();

      await run(collectionDir, ['rewrite-env-file-vars.yml', '--env', 'Local', '--env-file', 'env-file.json']);

      expect(findVariable(readEnvironment(localEnvPath), 'envFileToken')).toMatchObject({ secret: true, enabled: true });
      expectValueNotWritten(ROTATED_SECRET, [localEnvPath, envFilePath]);
    }, RUN_TIMEOUT);
  });

  describe('with only an --env-file', () => {
    it('persists script writes into the --env-file', async () => {
      const { collectionDir, envFilePath } = seedCollection();

      await run(collectionDir, ['rewrite-env-file-vars.yml', '--env-file', 'env-file.json']);

      expect(JSON.parse(fs.readFileSync(envFilePath, 'utf8')).variables).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'envFilePlain', value: 'rewritten', enabled: true })
      ]));
    }, RUN_TIMEOUT);

    // No format can hold a secret's value, json included: a rewritten secret row is emptied rather
    // than left carrying one.
    it('empties a rewritten secret row instead of carrying its value', async () => {
      const { collectionDir, envFilePath } = seedCollection();

      await run(collectionDir, ['rewrite-env-file-vars.yml', '--env-file', 'env-file.json']);

      expect(JSON.parse(fs.readFileSync(envFilePath, 'utf8')).variables).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'envFileToken', value: '', secret: true })
      ]));
      expectValueNotWritten(ROTATED_SECRET, [envFilePath]);
      expectValueNotWritten(ENV_FILE_SECRET, [envFilePath]);
    }, RUN_TIMEOUT);
  });
});
