import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';
import tls from 'tls';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createRequest, selectResponsePaneTab, sendRequestAndWaitForResponse, waitForReadyPage } from '../../utils/page';

const RETRY_MESSAGE = 'TLS handshake failed; retrying with post-quantum key exchange (X25519MLKEM768)';

const runtimeSupportsHybridGroup = (() => {
  try {
    tls.createSecureContext({ ecdhCurve: 'X25519MLKEM768' });
    return true;
  } catch {
    return false;
  }
})();

test.describe('post-quantum key exchange', () => {
  test.skip(!runtimeSupportsHybridGroup, 'requires OpenSSL 3.5+ to host a hybrid-only TLS server');

  const certsDir = path.join(__dirname, 'certs');
  const initUserDataPath = path.join(__dirname, 'init-user-data');

  let pqOnlyServer: https.Server;
  let pqOnlyPort: number;
  let failedHandshakes = 0;
  let proxy: http.Server;
  let proxyPort: number;
  let tunnels = 0;
  const tunnelSockets = new Set<net.Socket>();

  test.beforeAll(async () => {
    pqOnlyServer = https.createServer(
      {
        key: fs.readFileSync(path.join(certsDir, 'localhost.key')),
        cert: fs.readFileSync(path.join(certsDir, 'localhost.crt')),
        ecdhCurve: 'X25519MLKEM768'
      },
      (req, res) => res.end('post-quantum ok')
    );
    pqOnlyServer.on('tlsClientError', () => failedHandshakes++);

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
      new Promise<void>((resolve) => pqOnlyServer.listen(0, '127.0.0.1', resolve)),
      new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
    ]);
    pqOnlyPort = (pqOnlyServer.address() as net.AddressInfo).port;
    proxyPort = (proxy.address() as net.AddressInfo).port;
  });

  test.afterAll(async () => {
    pqOnlyServer?.closeAllConnections();
    tunnelSockets.forEach((socket) => socket.destroy());
    await Promise.all([
      new Promise((resolve) => (pqOnlyServer ? pqOnlyServer.close(resolve) : resolve(undefined))),
      new Promise((resolve) => (proxy ? proxy.close(resolve) : resolve(undefined)))
    ]);
  });

  test.beforeEach(() => {
    failedHandshakes = 0;
    tunnels = 0;
  });

  const openRequest = async (launchElectronApp, createTmpDir, { useProxy }: { useProxy: boolean }) => {
    const app = await launchElectronApp({
      initUserDataPath,
      templateVars: { proxyDisabled: String(!useProxy), proxyPort: String(proxyPort) }
    });
    const page = await waitForReadyPage(app);
    await createCollection(page, 'post-quantum', await createTmpDir('post-quantum'));
    await createRequest(page, 'pq-only', 'post-quantum', { url: `https://127.0.0.1:${pqOnlyPort}/` });
    return page;
  };

  test('retries with hybrid and reuses the setting', async ({ launchElectronApp, createTmpDir }) => {
    const page = await openRequest(launchElectronApp, createTmpDir, { useProxy: false });

    await test.step('First request succeeds after one rejected classical handshake', async () => {
      await sendRequestAndWaitForResponse(page, 200);
      await expect(buildCommonLocators(page).response.body()).toContainText('post-quantum ok');
      expect(failedHandshakes).toBe(1);
    });

    await test.step('Timeline shows the retry', async () => {
      const { timeline, timelineHeaders } = buildCommonLocators(page);
      await selectResponsePaneTab(page, 'Timeline');
      await timeline.itemHeader(timeline.items().first()).click();
      await timelineHeaders.networkTab().click();
      await expect(timeline.container()).toContainText(RETRY_MESSAGE);
    });

    await test.step('A new connection to the same endpoint offers the hybrid group first', async () => {
      // Each request opens a new connection: the server doesn't keep the connection alive.
      pqOnlyServer.closeAllConnections();
      await selectResponsePaneTab(page, 'Response');
      const failedBefore = failedHandshakes;
      await page.getByTestId('send-arrow-icon').click();
      await expect(buildCommonLocators(page).response.body()).toContainText('post-quantum ok');
      expect(failedHandshakes).toBe(failedBefore);
    });
  });

  test('retries through a proxy tunnel', async ({ launchElectronApp, createTmpDir }) => {
    const page = await openRequest(launchElectronApp, createTmpDir, { useProxy: true });

    await test.step('Request succeeds over a second tunnel', async () => {
      await sendRequestAndWaitForResponse(page, 200);
      await expect(buildCommonLocators(page).response.body()).toContainText('post-quantum ok');
      expect(failedHandshakes).toBe(1);
      expect(tunnels).toBe(2);
    });
  });
});
