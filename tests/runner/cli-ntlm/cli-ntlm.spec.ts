import * as path from 'path';
import { test, expect } from '../../../playwright';
import { cliOutput, runCLIAsync } from '../../utils/cli';
import { startNtlmServer, type NtlmEndpoint } from '@usebruno/tests/ntlm';

const COLLECTION = path.resolve(__dirname, 'collection');
const PASSWORD = 'Br!unoNtlm';

// The two tls cases spawn the cli, generate a certificate and complete a handshake: ~11s on a
// windows runner against ~2s locally, close enough to the 30s default to be worth the headroom.
test.describe.configure({ timeout: 60_000 });

test.describe('CLI run against an ntlm endpoint', () => {
  let endpoint: NtlmEndpoint;

  test.afterEach(async () => {
    await endpoint?.close();
  });

  test('authenticates over a single connection', async () => {
    endpoint = await startNtlmServer({ password: PASSWORD });

    const run = await runCLIAsync(COLLECTION, `run api.yml --noproxy --env-var baseUrl=${endpoint.baseUrl}`);

    await test.step('the run passed and the server saw one handshake on one connection', async () => {
      expect(run.code, cliOutput(run)).toBe(0);
      expect(run.stdout).toContain('api authenticates');
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('negotiates for each request of a collection run, and again for the connection a redirect moves onto', async () => {
    endpoint = await startNtlmServer({ password: PASSWORD });

    const run = await runCLIAsync(COLLECTION, `run . --noproxy --env-var baseUrl=${endpoint.baseUrl}`);

    await test.step('both requests passed and the server saw three negotiations', async () => {
      expect(endpoint.negotiations()).toHaveLength(3);
      expect(run.stdout).toContain('redirect authenticates');
      expect(run.stdout).toContain('2 (2 Passed)');
      expect(run.code, cliOutput(run)).toBe(0);
    });
  });

  test('authenticates against a self-signed endpoint when certificate checks are off', async () => {
    endpoint = await startNtlmServer({ tls: true, password: PASSWORD });

    const run = await runCLIAsync(COLLECTION, `run api.yml --insecure --noproxy --env-var baseUrl=${endpoint.baseUrl}`);

    await test.step('the run passed and the server saw one handshake on one connection', async () => {
      expect(run.code, cliOutput(run)).toBe(0);
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('authenticates against a self-signed endpoint trusted through --cacert', async () => {
    endpoint = await startNtlmServer({ tls: true, password: PASSWORD });

    const run = await runCLIAsync(COLLECTION, `run api.yml --cacert "${endpoint.certPath}" --noproxy --env-var baseUrl=${endpoint.baseUrl}`);

    await test.step('the run passed and the server saw one handshake on one connection', async () => {
      expect(run.code, cliOutput(run)).toBe(0);
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });
});
