import * as path from 'path';
import { test, expect, closeElectronApp, type ElectronApplication } from '../../../playwright';
import { buildCommonLocators, openRequest, sendRequest, waitForReadyPage } from '../../utils/page';
import { startNtlmServer, type NtlmEndpoint } from '@usebruno/tests/ntlm';
import { SELF_SIGNED_CERTIFICATE, TLS_HANDSHAKE_FAILURE } from '../../utils/constants';

const PASSWORD = 'Br!unoNtlm';

test.describe('ntlm against an endpoint with a self signed certificate', () => {
  let endpoint: NtlmEndpoint;
  let app: ElectronApplication;

  test.afterEach(async () => {
    await endpoint?.close();
    if (app) await closeElectronApp(app);
  });

  test('authenticates when certificate verification is off', async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD, tls: true });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-tls-off'),
      templateVars: { collectionPath: collectionFixturePath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });
    const page = await waitForReadyPage(app);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm-tls', 'api');
      await sendRequest(page, 200);
    });

    await test.step('the server saw one full handshake on one connection', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('authenticates when the certificate is trusted as a custom ca', async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD, tls: true });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-custom-ca'),
      templateVars: { collectionPath: collectionFixturePath!, certPath: endpoint.certPath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });
    const page = await waitForReadyPage(app);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm-tls', 'api');
      await sendRequest(page, 200);
    });

    await test.step('the server saw one full handshake on one connection', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('never reaches the server when certificate verification is left on', async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD, tls: true });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-verify-on'),
      templateVars: { collectionPath: collectionFixturePath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });
    const page = await waitForReadyPage(app);
    const { request, response } = buildCommonLocators(page);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm-tls', 'api');
      await request.sendButton().click();
    });

    await test.step('the request fails on the certificate before any leg is sent', async () => {
      await expect(response.errorMessage()).toContainText(SELF_SIGNED_CERTIFICATE, { timeout: 30000 });
      expect(endpoint.requests).toEqual([]);
    });
  });

  test('presents the client certificate on every request when the endpoint demands one', async ({
    launchElectronApp,
    collectionFixturePath
  }) => {
    endpoint = await startNtlmServer({ password: PASSWORD, tls: true, requireClientCert: true });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-client-cert'),
      templateVars: { collectionPath: collectionFixturePath!, clientCertPath: endpoint.clientCertPath!, clientKeyPath: endpoint.clientKeyPath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });
    const page = await waitForReadyPage(app);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm-tls', 'api');
      await sendRequest(page, 200);
    });

    await test.step('every leg presented the client certificate on one connection', async () => {
      expect(endpoint.messageTypesSeen()).toEqual([null, 1, 3]);
      expect(endpoint.requests.map((request) => request.clientCertName)).toEqual(Array(3).fill(endpoint.clientCertName));
      expect(endpoint.connectionsUsed()).toBe(1);
    });
  });

  test('never reaches that endpoint when no client certificate is configured', async ({ launchElectronApp, collectionFixturePath }) => {
    endpoint = await startNtlmServer({ password: PASSWORD, tls: true, requireClientCert: true });

    app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-tls-off'),
      templateVars: { collectionPath: collectionFixturePath! },
      dotEnv: { NTLM_BASE_URL: endpoint.baseUrl }
    });
    const page = await waitForReadyPage(app);
    const { request, response } = buildCommonLocators(page);

    await test.step('send a request with ntlm auth', async () => {
      await openRequest(page, 'ntlm-tls', 'api');
      await request.sendButton().click();
    });

    await test.step('the handshake is refused for want of a certificate before any leg is sent', async () => {
      await expect(response.errorMessage()).toContainText(TLS_HANDSHAKE_FAILURE, { timeout: 30000 });
      expect(endpoint.requests).toEqual([]);
    });
  });
});
