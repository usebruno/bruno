const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { runCli } = require('../helpers/run-cli');
const { createCollectionFixture } = require('../helpers/collection-fixture');
const { startNtlmServer } = require('../../../../bruno-tests/src/ntlm');

const FIXTURE_COLLECTION = path.join(__dirname, 'fixtures', 'collection');
const FIXTURE_PASSWORD = 'Br!unoNtlm';

describe('CLI run — ntlm', () => {
  let endpoint;
  let collectionDir;

  const startEndpoint = (options) => startNtlmServer({ ...options, password: FIXTURE_PASSWORD });

  const run = (args) => runCli(['run', ...args, '--noproxy', '--env-var', `baseUrl=${endpoint.baseUrl}`], collectionDir);

  beforeEach(() => {
    collectionDir = createCollectionFixture(FIXTURE_COLLECTION);
  });

  afterEach(async () => {
    await endpoint?.close();
    endpoint = undefined;
    fs.rmSync(collectionDir, { recursive: true, force: true });
  });

  it('authenticates over a single connection', async () => {
    endpoint = await startEndpoint();

    const { code, stdout } = await run(['api.yml']);

    expect(code).toBe(0);
    expect(stdout).toContain('api authenticates');
    expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(endpoint.connectionsUsed()).toBe(1);
  });

  it('negotiates again for every request of a collection run, and cannot re-authenticate a redirect that lands on a new connection', async () => {
    endpoint = await startEndpoint();

    const { code, stdout } = await run(['.']);

    expect(endpoint.negotiations()).toHaveLength(2);
    expect(stdout).toContain('1 Passed, 1 Failed');
    expect(stdout).toContain('401 Unauthorized');
    expect(code).toBe(1);
  });

  it('authenticates against a self-signed endpoint when certificate checks are off', async () => {
    endpoint = await startEndpoint({ tls: true });

    const { code } = await run(['api.yml', '--insecure']);

    expect(code).toBe(0);
    expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(endpoint.connectionsUsed()).toBe(1);
  });

  it('authenticates against a self-signed endpoint trusted through --cacert', async () => {
    endpoint = await startEndpoint({ tls: true });

    const { code } = await run(['api.yml', '--cacert', endpoint.certPath]);

    expect(code).toBe(0);
    expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
    expect(endpoint.connectionsUsed()).toBe(1);
  });
});
