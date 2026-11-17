import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test, expect, waitForReadyPage, closeElectronApp } from '../../../playwright';
import { buildCommonLocators, selectRequestPaneTab, saveRequest } from '../../utils/page';
import { startLocalServer } from '../../utils/local-server';

const executeFile = promisify(execFile);

for (const format of ['bru', 'yml']) {
  test(`request proxy toggle routes traffic and persists in ${format}`, async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    let proxyHits = 0;
    let directHits = 0;
    const target = await startLocalServer((req, res) => {
      const proxied = req.headers['x-test-proxy'] === 'yes';
      if (!proxied) directHits++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ route: proxied ? 'via-app-proxy' : 'direct-connection' }));
    });
    const proxy = await startLocalServer((req, res) => {
      proxyHits++;
      const url = new URL(req.url!);
      const forwarded = http.request({
        hostname: url.hostname, port: url.port, path: url.pathname + url.search,
        method: req.method, headers: { ...req.headers, 'host': url.host, 'x-test-proxy': 'yes' }
      }, (response) => {
        res.writeHead(response.statusCode!, response.headers);
        response.pipe(res);
      });
      forwarded.on('error', () => {
        res.writeHead(502);
        res.end();
      });
      req.pipe(forwarded);
    });
    const proxyPort = Number(new URL(proxy.url).port);
    const collectionPath = await createTmpDir('request-proxy');
    const initUserDataPath = await createTmpDir('request-proxy-prefs');
    const name = `request-proxy-${format}`;
    const collectionProxy = { inherit: false, disabled: false, config: { protocol: 'http', hostname: '127.0.0.1', port: 1, bypassProxy: '' } };
    if (format === 'bru') {
      await fs.writeFile(path.join(collectionPath, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection', proxy: collectionProxy }));
      await fs.writeFile(path.join(collectionPath, 'request.bru'), `meta {\n  name: Proxy Request\n  type: http\n  seq: 1\n}\n\nget {\n  url: ${target.url}/route\n  body: none\n  auth: none\n}\n`);
    } else {
      await fs.writeFile(path.join(collectionPath, 'opencollection.yml'), JSON.stringify({ opencollection: '1.0.0', info: { name }, config: { proxy: collectionProxy } }));
      await fs.writeFile(path.join(collectionPath, 'request.yml'), JSON.stringify({ info: { name: 'Proxy Request', type: 'http', seq: 1 }, http: { method: 'GET', url: `${target.url}/route` } }));
    }
    await fs.writeFile(path.join(initUserDataPath, 'preferences.json'), JSON.stringify({
      lastOpenedCollections: [collectionPath],
      preferences: { proxy: { source: 'manual', disabled: false, config: { protocol: 'http', hostname: '127.0.0.1', port: proxyPort, auth: { disabled: true }, bypassProxy: '' } } }
    }));

    const app = await launchElectronApp({ initUserDataPath });
    try {
      const page = await waitForReadyPage(app);
      const { sidebar, requestSettings, request, response, tabs } = buildCommonLocators(page);
      await sidebar.collection(name).click();
      await sidebar.request('Proxy Request').click();
      await selectRequestPaneTab(page, 'Settings');

      await test.step('The default enabled switch follows the app proxy', async () => {
        await expect(requestSettings.useAppProxyToggle()).toHaveAttribute('aria-checked', 'true');
        await request.sendButton().click();
        await expect(response.pane()).toContainText('via-app-proxy');
        expect(proxyHits).toBe(1);
      });

      await test.step('Disabling connects directly and saves the choice', async () => {
        await requestSettings.useAppProxyToggle().click();
        await saveRequest(page);
        await expect.poll(() => fs.readFile(path.join(collectionPath, `request.${format}`), 'utf8')).toMatch(/useProxy:\s*false/);
        await request.sendButton().click();
        await expect(response.pane()).toContainText('direct-connection');
        expect(proxyHits).toBe(1);
      });

      await test.step('Closing and reopening preserves the direct setting', async () => {
        await tabs.requestTab('Proxy Request').hover();
        await tabs.closeTab('Proxy Request').click({ force: true });
        await sidebar.request('Proxy Request').click();
        await selectRequestPaneTab(page, 'Settings');
        await expect(requestSettings.useAppProxyToggle()).toHaveAttribute('aria-checked', 'false');
      });

      await test.step('The CLI also honors the saved direct setting', async () => {
        const before = directHits;
        await executeFile(process.execPath, [path.resolve(__dirname, '../../../packages/bruno-cli/bin/bru.js'), 'run', `request.${format}`], {
          cwd: collectionPath, timeout: 20000, env: { ...process.env, NO_PROXY: '', no_proxy: '' }
        });
        expect(directHits).toBeGreaterThan(before);
        expect(proxyHits).toBe(1);
      });

      await test.step('Enabling again restores the app proxy', async () => {
        await requestSettings.useAppProxyToggle().click();
        await request.sendButton().click();
        await expect(response.pane()).toContainText('via-app-proxy');
        expect(proxyHits).toBe(2);
      });
    } finally {
      await closeElectronApp(app);
      proxy.close();
      target.close();
    }
  });
}
