import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage, openWorkspaceFromDialog } from '../utils/page';
import { buildTitleBarLocators } from '../utils/page/title-bar';
import {
  buildMockServerLocators,
  createMockServerFromCollection,
  openMockServerFromSidebar,
  openMockServerTab,
  startMockServer,
  stopMockServer,
  syncResponsesFromExamples
} from '../utils/page/mock-server';

const COLLECTION_NAME = 'mock-server-other-collection';
const BROWSER_ORIGIN = 'https://docs.example.com';
const CORS_MOCK_PORT = '4710';
let mockPort = '';
const getMockBase = () => `http://127.0.0.1:${mockPort}`;

const preflight = (urlPath: string, requestMethod: string, requestHeaders: string) => fetch(`${getMockBase()}${urlPath}`, {
  method: 'OPTIONS',
  headers: {
    'Origin': BROWSER_ORIGIN,
    'Access-Control-Request-Method': requestMethod,
    'Access-Control-Request-Headers': requestHeaders
  }
});

test.describe.serial('Mock server CORS preflight', () => {
  test('creates and starts a mock server with a synced /health route', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);

    await createMockServerFromCollection(page, COLLECTION_NAME, 'CORS Mock Server', CORS_MOCK_PORT);
    await syncResponsesFromExamples(page, COLLECTION_NAME);
    mockPort = await startMockServer(page);

    await expect(ms.statusText()).toContainText(`Running on port ${CORS_MOCK_PORT}`);
    await expect(ms.tabRoutesCount()).toHaveText('1');
  });

  test('allows a custom request header in the preflight response', async () => {
    const res = await test.step('Send a preflight requesting x-api-key for GET /health', async () => {
      return preflight('/health', 'GET', 'x-api-key');
    });

    await test.step('Preflight allows the origin, the requested header and method', async () => {
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-headers')).toBe('x-api-key');
      expect(res.headers.get('access-control-allow-methods')).toBe('GET');
    });
  });

  test('allows a custom method in the preflight response', async () => {
    const res = await test.step('Send a preflight requesting PURGE for /health', async () => {
      return preflight('/health', 'PURGE', 'x-api-key');
    });

    await test.step('Preflight allows the requested method', async () => {
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-methods')).toBe('PURGE');
    });
  });

  test('answers a preflight for a path with no mock route', async () => {
    const res = await test.step('Send a preflight for an unknown path', async () => {
      return preflight('/no-such-route', 'GET', 'x-api-key');
    });

    await test.step('Preflight is answered with 204 and the requested header', async () => {
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-headers')).toBe('x-api-key');
    });
  });

  test('answers a plain OPTIONS request with no OPTIONS mock route with 204', async () => {
    const res = await test.step('Send a plain OPTIONS request to /health', async () => {
      return fetch(`${getMockBase()}/health`, { method: 'OPTIONS' });
    });

    await test.step('Request gets the automatic 204 with CORS headers', async () => {
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  test('serves the actual request that follows a preflight', async () => {
    const res = await test.step('Send the cross-origin GET /health', async () => {
      return fetch(`${getMockBase()}/health`, {
        headers: { 'Origin': BROWSER_ORIGIN, 'x-api-key': 'admin' }
      });
    });

    await test.step('Mock response is served with the CORS origin header', async () => {
      expect(res.status).toBe(200);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(await res.json()).toEqual({ status: 'ok' });
    });
  });

  test('shows automatic OPTIONS answers in the Request Log as matched entries', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await ms.tabLog().click();

    const preflightRows = ms.logRows().filter({ hasText: 'CORS preflight' });
    const plainOptionsRows = ms.logRows().filter({ hasText: 'Automatic OPTIONS response' });

    await test.step('Every automatically answered preflight is logged', async () => {
      await expect(preflightRows).toHaveCount(3);
    });

    await test.step('A preflight row shows the path, 204 status and no No Match label', async () => {
      const row = preflightRows.filter({ hasText: '/no-such-route' });
      await expect(row).toHaveCount(1);
      await expect(ms.logRowStatusCode(row)).toHaveText('204');
      await expect(ms.logRowNoMatchLabel(row)).toHaveCount(0);
    });

    await test.step('The plain OPTIONS request is logged as an automatic 204', async () => {
      const row = plainOptionsRows.filter({ hasText: '/health' });
      await expect(row).toHaveCount(1);
      await expect(ms.logRowStatusCode(row)).toHaveText('204');
      await expect(ms.logRowNoMatchLabel(row)).toHaveCount(0);
    });
  });

  test('stops the mock server', async ({ pageWithUserData: page }) => {
    const ms = buildMockServerLocators(page);
    await openMockServerTab(page, COLLECTION_NAME);
    await stopMockServer(page);

    await expect(ms.statusText()).toContainText('Stopped');
  });
});

const RULES_WORKSPACE_NAME = 'CorsRulesWorkspace';
const RULES_MOCK_SERVER = 'CORS Rules Mock';
const RULES_MOCK_PORT = '4711';

const RULES_PREFERENCES = JSON.stringify({
  preferences: {
    onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true },
    beta: { 'mock-server': true }
  }
}, null, 2);

const RULES_WORKSPACE_YML = [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${RULES_WORKSPACE_NAME}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

const RULES_MOCK_YML = [
  'info:',
  `  name: ${RULES_MOCK_SERVER}`,
  '  type: mock',
  'mock:',
  `  port: ${RULES_MOCK_PORT}`,
  '  delay: 0',
  'routes:',
  '  - name: Admin post',
  '    request:',
  '      method: GET',
  '      url: /posts/:postId',
  '    response:',
  '      status: 200',
  '      body:',
  '        type: json',
  '        data: \'{"role":"admin"}\'',
  '    rules:',
  '      operator: AND',
  '      conditions:',
  '        - target: header',
  '          key: x-api-key',
  '          operator: equals',
  '          value: admin',
  '  - name: Guarded options',
  '    request:',
  '      method: OPTIONS',
  '      url: /guarded',
  '    response:',
  '      status: 200',
  '      body:',
  '        type: json',
  '        data: \'{"guarded":true}\'',
  '    rules:',
  '      operator: AND',
  '      conditions:',
  '        - target: header',
  '          key: x-never-sent',
  '          operator: equals',
  '          value: "yes"',
  '  - name: Resources options',
  '    request:',
  '      method: OPTIONS',
  '      url: /resources',
  '    response:',
  '      status: 200',
  '      body:',
  '        type: json',
  '        data: \'{"allow":"GET"}\'',
  '  - name: Purge cache',
  '    request:',
  '      method: PURGE',
  '      url: /cache',
  '    response:',
  '      status: 200',
  '      body:',
  '        type: json',
  '        data: \'{"purged":true}\'',
  ''
].join('\n');

test.describe('Mock server CORS with response rules and custom methods', () => {
  test('answers preflights for rule-guarded and custom-method routes and matches header rules', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    test.setTimeout(90000);

    const userDataPath = await createTmpDir('mock-server-cors-rules');
    fs.writeFileSync(path.join(userDataPath, 'preferences.json'), RULES_PREFERENCES);

    const workspacePath = await createTmpDir('cors-rules-workspace');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), RULES_WORKSPACE_YML);
    fs.mkdirSync(path.join(workspacePath, 'mocks'), { recursive: true });
    fs.writeFileSync(path.join(workspacePath, 'mocks', 'cors-rules-mock.yml'), RULES_MOCK_YML);

    const app = await launchElectronApp({ userDataPath });
    const rulesBase = `http://127.0.0.1:${RULES_MOCK_PORT}`;
    const rulesPreflight = (urlPath: string, requestMethod: string) => fetch(`${rulesBase}${urlPath}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': BROWSER_ORIGIN,
        'Access-Control-Request-Method': requestMethod,
        'Access-Control-Request-Headers': 'x-api-key'
      }
    });

    try {
      const page = await waitForReadyPage(app);
      const titleBar = buildTitleBarLocators(page);
      const ms = buildMockServerLocators(page);

      await test.step('Open the workspace and start its mock server', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await expect(titleBar.activeWorkspaceName()).toHaveText(RULES_WORKSPACE_NAME, { timeout: 10000 });
        await openMockServerFromSidebar(page, RULES_MOCK_SERVER);
        await startMockServer(page);
        await expect(ms.statusText()).toContainText(`Running on port ${RULES_MOCK_PORT}`);
      });

      await test.step('A user-defined OPTIONS route is served for plain and preflight requests', async () => {
        const plain = await fetch(`${rulesBase}/resources`, { method: 'OPTIONS' });
        expect(plain.status).toBe(200);
        expect(await plain.json()).toEqual({ allow: 'GET' });

        const preflightRes = await rulesPreflight('/resources', 'GET');
        expect(preflightRes.status).toBe(200);
        expect(preflightRes.headers.get('access-control-allow-headers')).toBe('x-api-key');
        expect(await preflightRes.json()).toEqual({ allow: 'GET' });
      });

      await test.step('A preflight to an OPTIONS route whose rules fail gets the automatic 204', async () => {
        const res = await rulesPreflight('/guarded', 'GET');
        expect(res.status).toBe(204);
        expect(res.headers.get('access-control-allow-headers')).toBe('x-api-key');
      });

      await test.step('The request after the preflight matches the x-api-key header rule', async () => {
        const preflightRes = await rulesPreflight('/posts/1', 'GET');
        expect(preflightRes.status).toBe(204);

        const withHeader = await fetch(`${rulesBase}/posts/1`, {
          headers: { 'Origin': BROWSER_ORIGIN, 'x-api-key': 'admin' }
        });
        expect(withHeader.status).toBe(200);
        expect(withHeader.headers.get('access-control-allow-origin')).toBe('*');
        expect(await withHeader.json()).toEqual({ role: 'admin' });

        const withoutHeader = await fetch(`${rulesBase}/posts/1`, { headers: { Origin: BROWSER_ORIGIN } });
        expect(withoutHeader.status).toBe(404);
      });

      await test.step('A custom-method route is reachable after its preflight', async () => {
        const preflightRes = await rulesPreflight('/cache', 'PURGE');
        expect(preflightRes.status).toBe(204);
        expect(preflightRes.headers.get('access-control-allow-methods')).toBe('PURGE');

        const res = await fetch(`${rulesBase}/cache`, { method: 'PURGE', headers: { Origin: BROWSER_ORIGIN } });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ purged: true });
      });

      await stopMockServer(page);
    } finally {
      await closeElectronApp(app);
    }
  });
});
