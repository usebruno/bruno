import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';
import { test, expect } from '../../../../playwright';
import { buildCommonLocators, openAiPreferences, testCompatEndpointConnection } from '../../../../pages';
import { waitForReadyPage } from '../../../../utils';

const ENDPOINT_ID = 'private-gateway';
const NO_PROXY_BYPASS = 'no-bypass.invalid';

test.describe('AI provider requests, the proxy and the custom CA certificate', () => {
  const certsDir = path.join(__dirname, '../../../request/post-quantum-key-exchange/certs');
  const selfSignedCertPath = path.join(certsDir, 'localhost.crt');
  const initUserDataPath = path.join(__dirname, 'init-user-data');

  let endpointServer: https.Server;
  let endpointPort: number;
  let modelListRequests = 0;
  let proxy: http.Server;
  let proxyPort: number;
  let tunnels = 0;
  const tunnelSockets = new Set<net.Socket>();

  test.beforeAll(async () => {
    endpointServer = https.createServer(
      {
        key: fs.readFileSync(path.join(certsDir, 'localhost.key')),
        cert: fs.readFileSync(selfSignedCertPath)
      },
      (req, res) => {
        if (req.method === 'GET' && req.url === '/v1/models') {
          modelListRequests++;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ object: 'list', data: [{ id: 'test-model', object: 'model' }] }));
          return;
        }
        res.writeHead(404);
        res.end();
      }
    );

    proxy = http.createServer();
    proxy.on('connect', (req, clientSocket: net.Socket, head) => {
      tunnels++;
      const [host, port] = String(req.url).split(':');
      const upstream = net.connect(Number(port), host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      tunnelSockets.add(clientSocket).add(upstream);
      upstream.on('error', () => clientSocket.destroy());
      clientSocket.on('error', () => upstream.destroy());
    });

    await Promise.all([
      new Promise<void>((resolve) => endpointServer.listen(0, '127.0.0.1', resolve)),
      new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
    ]);
    endpointPort = (endpointServer.address() as net.AddressInfo).port;
    proxyPort = (proxy.address() as net.AddressInfo).port;
  });

  test.afterAll(async () => {
    endpointServer?.closeAllConnections();
    tunnelSockets.forEach((socket) => socket.destroy());
    await Promise.all([
      new Promise((resolve) => (endpointServer ? endpointServer.close(resolve) : resolve(undefined))),
      new Promise((resolve) => (proxy ? proxy.close(resolve) : resolve(undefined)))
    ]);
  });

  test.beforeEach(() => {
    modelListRequests = 0;
    tunnels = 0;
  });

  const openAiPreferencesWith = async (
    launchElectronApp,
    {
      customCaEnabled,
      customCaFilePath,
      useProxy = false,
      proxyBypass = NO_PROXY_BYPASS
    }: { customCaEnabled: boolean; customCaFilePath: string; useProxy?: boolean; proxyBypass?: string }
  ) => {
    const app = await launchElectronApp({
      initUserDataPath,
      templateVars: {
        customCaEnabled: String(customCaEnabled),
        customCaFilePath,
        endpointPort: String(endpointPort),
        proxyDisabled: String(!useProxy),
        proxyPort: String(proxyPort),
        proxyBypass
      }
    });
    const page = await waitForReadyPage(app);
    await openAiPreferences(page);
    return page;
  };

  test('trusts an endpoint signed by the custom CA certificate', async ({ launchElectronApp }) => {
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: true,
      customCaFilePath: selfSignedCertPath
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The connection succeeds and the endpoint received the request', async () => {
      await expect(feedback()).toHaveText('Connection successful');
      expect(modelListRequests).toBe(1);
      expect(tunnels).toBe(0);
    });
  });

  test('sends the request through the proxy from the proxy preferences', async ({ launchElectronApp }) => {
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: true,
      customCaFilePath: selfSignedCertPath,
      useProxy: true
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The connection succeeds through one proxy tunnel', async () => {
      await expect(feedback()).toHaveText('Connection successful');
      expect(tunnels).toBe(1);
      expect(modelListRequests).toBe(1);
    });
  });

  test('connects directly to a host on the proxy bypass list', async ({ launchElectronApp }) => {
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: true,
      customCaFilePath: selfSignedCertPath,
      useProxy: true,
      proxyBypass: 'localhost'
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The connection succeeds without using the proxy', async () => {
      await expect(feedback()).toHaveText('Connection successful');
      expect(tunnels).toBe(0);
      expect(modelListRequests).toBe(1);
    });
  });

  test('still requires the custom CA certificate when a proxy is used', async ({ launchElectronApp }) => {
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: false,
      customCaFilePath: selfSignedCertPath,
      useProxy: true
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The request reaches the proxy but the endpoint certificate is rejected', async () => {
      await expect(feedback()).toBeVisible();
      await expect(feedback()).not.toHaveText('Connection successful');
      expect(tunnels).toBe(1);
      expect(modelListRequests).toBe(0);
    });
  });

  test('does not trust the endpoint when the custom CA certificate is off', async ({ launchElectronApp }) => {
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: false,
      customCaFilePath: selfSignedCertPath
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The connection fails before any request reaches the endpoint', async () => {
      await expect(feedback()).toBeVisible();
      await expect(feedback()).not.toHaveText('Connection successful');
      expect(modelListRequests).toBe(0);
    });
  });

  test('reports the file path when the custom CA certificate file is missing', async ({ launchElectronApp }) => {
    const missingCertPath = path.join(certsDir, 'missing-ca.crt');
    const page = await openAiPreferencesWith(launchElectronApp, {
      customCaEnabled: true,
      customCaFilePath: missingCertPath
    });
    const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

    await testCompatEndpointConnection(page, ENDPOINT_ID);

    await test.step('The error names the missing file', async () => {
      await expect(feedback()).toContainText('Invalid custom CA certificate path');
      await expect(feedback()).toContainText('missing-ca.crt');
      expect(modelListRequests).toBe(0);
    });
  });
});
