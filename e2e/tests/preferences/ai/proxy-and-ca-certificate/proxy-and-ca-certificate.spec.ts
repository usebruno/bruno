import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';
import { pathToFileURL } from 'url';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  expandCopilotCard,
  openAiPreferences,
  testCompatEndpointConnection
} from '../../../../pages';
import { waitForReadyPage } from '../../../../utils';

const ENDPOINT_ID = 'private-gateway';
const MODEL_ID = 'test-model';
const NO_PROXY_BYPASS = 'no-bypass.invalid';
const UNUSED_PAC_URL = 'http://pac.invalid/proxy.pac';

type ProxyMode = 'off' | 'manual' | 'pac' | 'system';

type LaunchOptions = {
  sslVerification?: boolean;
  customCaEnabled?: boolean;
  customCaFilePath?: string;
  proxy?: ProxyMode;
  proxyBypass?: string;
  endpointBasePath?: string;
  pacDir?: string;
};

test.describe('AI provider requests, the proxy and the custom CA certificate', () => {
  const certsDir = path.join(__dirname, 'certs');
  const selfSignedCertPath = path.join(certsDir, 'localhost.crt');
  const initUserDataPath = path.join(__dirname, 'init-user-data');

  let endpointServer: https.Server;
  let endpointPort: number;
  let proxy: http.Server;
  let proxyPort: number;
  const requests = { modelList: 0 };
  const proxyTunnels = { opened: [] as string[], refused: [] as string[] };
  const tunnelSockets = new Set<net.Socket>();

  test.beforeAll(async () => {
    endpointServer = https.createServer(
      {
        key: fs.readFileSync(path.join(certsDir, 'localhost.key')),
        cert: fs.readFileSync(selfSignedCertPath)
      },
      (req, res) => {
        if (req.method === 'GET' && req.url === '/v1/models') {
          requests.modelList++;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ object: 'list', data: [{ id: MODEL_ID, object: 'model' }] }));
          return;
        }
        if (req.method === 'GET' && req.url === '/moved/v1/models') {
          res.writeHead(302, { location: '/v1/models' });
          res.end();
          return;
        }
        res.writeHead(404);
        res.end();
      }
    );

    proxy = http.createServer();
    proxy.on('connect', (req, clientSocket: net.Socket, head) => {
      const target = String(req.url);
      const [host, port] = target.split(':');
      tunnelSockets.add(clientSocket);
      clientSocket.on('error', () => clientSocket.destroy());

      if (Number(port) !== endpointPort) {
        proxyTunnels.refused.push(target);
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        return;
      }

      proxyTunnels.opened.push(target);
      const upstream = net.connect(Number(port), host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      tunnelSockets.add(upstream);
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
    requests.modelList = 0;
    proxyTunnels.opened.length = 0;
    proxyTunnels.refused.length = 0;
  });

  const writePacFile = async (pacDir: string) => {
    const pacFilePath = path.join(pacDir, 'proxy.pac');
    await fs.promises.writeFile(
      pacFilePath,
      `function FindProxyForURL(url, host) { return 'PROXY 127.0.0.1:${proxyPort}'; }\n`
    );
    return pathToFileURL(pacFilePath).href;
  };

  const launchApp = async (
    launchElectronApp,
    {
      sslVerification = true,
      customCaEnabled = true,
      customCaFilePath = selfSignedCertPath,
      proxy: proxyMode = 'off',
      proxyBypass = NO_PROXY_BYPASS,
      endpointBasePath = '/v1',
      pacDir
    }: LaunchOptions
  ) => {
    const proxyUrl = `http://127.0.0.1:${proxyPort}`;
    const pacUrl = proxyMode === 'pac' && pacDir ? await writePacFile(pacDir) : UNUSED_PAC_URL;
    const proxySource = { off: 'manual', manual: 'manual', pac: 'pac', system: 'inherit' }[proxyMode];

    const app = await launchElectronApp({
      initUserDataPath,
      templateVars: {
        sslVerification: String(sslVerification),
        customCaEnabled: String(customCaEnabled),
        customCaFilePath: customCaFilePath.split(path.sep).join('/'),
        endpointPort: String(endpointPort),
        endpointBasePath,
        proxySource,
        proxyDisabled: String(proxyMode === 'off'),
        proxyPort: String(proxyPort),
        proxyBypass,
        pacUrl
      },
      dotEnv:
        proxyMode === 'system'
          ? {
              HTTPS_PROXY: proxyUrl,
              https_proxy: proxyUrl,
              HTTP_PROXY: proxyUrl,
              http_proxy: proxyUrl,
              NO_PROXY: NO_PROXY_BYPASS,
              no_proxy: NO_PROXY_BYPASS
            }
          : {}
    });
    return waitForReadyPage(app);
  };

  const openAiPreferencesWith = async (launchElectronApp, options: LaunchOptions) => {
    const page = await launchApp(launchElectronApp, options);
    await openAiPreferences(page);
    return page;
  };

  test.describe('Custom CA certificate', () => {
    test('trusts an endpoint signed by the custom CA certificate', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { customCaEnabled: true });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds and the endpoint received the request', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(requests.modelList).toBe(1);
        expect(proxyTunnels.opened).toHaveLength(0);
      });
    });

    test('trusts the endpoint without a custom CA certificate when SSL verification is off', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { sslVerification: false, customCaEnabled: false });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds and the endpoint received the request', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(requests.modelList).toBe(1);
        expect(proxyTunnels.opened).toHaveLength(0);
      });
    });

    test('does not trust the endpoint when the custom CA certificate is off', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { customCaEnabled: false });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection fails before any request reaches the endpoint', async () => {
        await expect(feedback()).toBeVisible();
        await expect(feedback()).not.toHaveText('Connection successful');
        expect(requests.modelList).toBe(0);
      });
    });

    test('reports the file path when the custom CA certificate file is missing', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, {
        customCaEnabled: true,
        customCaFilePath: path.join(certsDir, 'missing-ca.crt')
      });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The error names the missing file', async () => {
        await expect(feedback()).toContainText('Invalid custom CA certificate path');
        await expect(feedback()).toContainText('missing-ca.crt');
        expect(requests.modelList).toBe(0);
      });
    });

    test('reports a redirect instead of following it', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, {
        customCaEnabled: true,
        endpointBasePath: '/moved/v1'
      });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The error names the address the endpoint redirected to', async () => {
        await expect(feedback()).toContainText('Redirects are not followed');
        await expect(feedback()).toContainText(`https://localhost:${endpointPort}/v1/models`);
        expect(requests.modelList).toBe(0);
      });
    });
  });

  test.describe('Proxy', () => {
    test('sends the request through the proxy from the proxy preferences', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'manual' });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds through one proxy tunnel', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(proxyTunnels.opened).toEqual([`localhost:${endpointPort}`]);
        expect(requests.modelList).toBe(1);
      });
    });

    test('connects directly to a host on the proxy bypass list', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'manual', proxyBypass: 'localhost' });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds without using the proxy', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(proxyTunnels.opened).toHaveLength(0);
        expect(requests.modelList).toBe(1);
      });
    });

    test('still requires the custom CA certificate when a proxy is used', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'manual', customCaEnabled: false });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The request reaches the proxy but the endpoint certificate is rejected', async () => {
        await expect(feedback()).toBeVisible();
        await expect(feedback()).not.toHaveText('Connection successful');
        expect(proxyTunnels.opened).toHaveLength(1);
        expect(requests.modelList).toBe(0);
      });
    });

    test('sends the request through the proxy chosen by the PAC file', async ({ launchElectronApp, createTmpDir }) => {
      const pacDir = await createTmpDir('ai-proxy-pac');
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'pac', pacDir });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds through one proxy tunnel', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(proxyTunnels.opened).toEqual([`localhost:${endpointPort}`]);
        expect(requests.modelList).toBe(1);
      });
    });

    test('sends the request through the system proxy', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'system' });
      const { feedback } = buildCommonLocators(page).ai.compatEndpoint(ENDPOINT_ID);

      await testCompatEndpointConnection(page, ENDPOINT_ID);

      await test.step('The connection succeeds through one proxy tunnel', async () => {
        await expect(feedback()).toHaveText('Connection successful');
        expect(proxyTunnels.opened).toEqual([`localhost:${endpointPort}`]);
        expect(requests.modelList).toBe(1);
      });
    });

    test('sends the GitHub Copilot sign-in through the proxy', async ({ launchElectronApp }) => {
      const page = await openAiPreferencesWith(launchElectronApp, { proxy: 'manual' });
      const { copilot } = buildCommonLocators(page).ai;

      await expandCopilotCard(page);

      await test.step('Click Sign in with GitHub', async () => {
        await copilot.signInButton().click();
      });

      await test.step('The proxy received the sign-in request and the card shows the failure', async () => {
        await expect(copilot.error()).toBeVisible();
        expect(proxyTunnels.refused).toContain('github.com:443');
        await expect(copilot.header()).toContainText('Not signed in');
      });
    });
  });
});
