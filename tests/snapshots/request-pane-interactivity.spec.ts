import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  openRequest,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const readSnapshot = (userDataPath: string) => {
  const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
  if (!fs.existsSync(snapshotPath)) return null;
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
};

const findSnapshotRequestTab = (snapshot: any, requestName: string) => {
  if (!snapshot || !Array.isArray(snapshot.collections)) {
    return null;
  }

  for (const collection of snapshot.collections) {
    if (!Array.isArray(collection?.tabs)) continue;

    const tab = collection.tabs.find((candidate) => (
      candidate?.accessor === 'pathname'
      && typeof candidate?.pathname === 'string'
      && candidate.pathname.includes(requestName)
    ));

    if (tab) {
      return tab;
    }
  }

  return null;
};

test.describe('Snapshot: Request Pane Interactivity', () => {
  test('grpc request pane tab interactivity is restored after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-grpc-interactivity');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and gRPC request', async () => {
      await createCollection(page, 'TestCol', colPath);

      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('TestCol').hover();
      await locators.actions.collectionActions('TestCol').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('grpc-request').click();
      await page.getByTestId('request-name').fill('ReqGrpc');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('grpc://localhost:50051');
      await locators.modal.button('Create').click();

      await openRequest(page, 'TestCol', 'ReqGrpc', { persist: true });
      await selectRequestPaneTab(page, 'Metadata');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify gRPC pane tabs remain interactive', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqGrpc')).toBeVisible({ timeout: 15000 });
      await locators.tabs.requestTab('ReqGrpc').click({ force: true });

      await selectRequestPaneTab(page2, 'Metadata');
      await selectRequestPaneTab(page2, 'Auth');
      await selectRequestPaneTab(page2, 'Docs');
      await selectRequestPaneTab(page2, 'Message');

      await closeElectronApp(app2);
    });
  });

  test('websocket request pane tab interactivity is restored after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-ws-interactivity');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and WebSocket request', async () => {
      await createCollection(page, 'TestCol', colPath);

      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('TestCol').hover();
      await locators.actions.collectionActions('TestCol').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('ws-request').click();
      await page.getByTestId('request-name').fill('ReqWs');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('ws://localhost:8080');
      await locators.modal.button('Create').click();

      await openRequest(page, 'TestCol', 'ReqWs', { persist: true });
      await selectRequestPaneTab(page, 'Headers');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify WebSocket pane tabs remain interactive', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqWs')).toBeVisible({ timeout: 15000 });
      await locators.tabs.requestTab('ReqWs').click({ force: true });

      await selectRequestPaneTab(page2, 'Headers');
      await selectRequestPaneTab(page2, 'Auth');
      await selectRequestPaneTab(page2, 'Settings');
      await selectRequestPaneTab(page2, 'Docs');
      await selectRequestPaneTab(page2, 'Message');

      await closeElectronApp(app2);
    });
  });

  test('grpc snapshot stores concrete type and body tab key', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-grpc-snapshot-type-tab-key');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and gRPC request', async () => {
      await createCollection(page, 'TestCol', colPath);

      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('TestCol').hover();
      await locators.actions.collectionActions('TestCol').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('grpc-request').click();
      await page.getByTestId('request-name').fill('ReqGrpcSnapshot');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('grpc://localhost:50051');
      await locators.modal.button('Create').click();

      await openRequest(page, 'TestCol', 'ReqGrpcSnapshot', { persist: true });
      await selectRequestPaneTab(page, 'Message');
    });

    await test.step('Close app and verify snapshot stores grpc-request/body', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
      await expect.poll(() => fs.existsSync(snapshotPath)).toBe(true);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotRequestTab(snapshot, 'ReqGrpcSnapshot');
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('grpc-request');
      expect(tab.request?.tab).toBe('body');
    });

    await test.step('Verify restore opens Message tab and avoids 404', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqGrpcSnapshot')).toBeVisible({ timeout: 15000 });
      await locators.tabs.requestTab('ReqGrpcSnapshot').click({ force: true });

      await expect(page2.getByTestId('responsive-tab-body')).toHaveAttribute('aria-selected', 'true');
      await expect(page2.locator('text=404 | Not found')).not.toBeVisible();

      await closeElectronApp(app2);
    });
  });

  test('websocket snapshot stores concrete type and body tab key', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-ws-snapshot-type-tab-key');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and WebSocket request', async () => {
      await createCollection(page, 'TestCol', colPath);

      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('TestCol').hover();
      await locators.actions.collectionActions('TestCol').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('ws-request').click();
      await page.getByTestId('request-name').fill('ReqWsSnapshot');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('ws://localhost:8080');
      await locators.modal.button('Create').click();

      await openRequest(page, 'TestCol', 'ReqWsSnapshot', { persist: true });
      await selectRequestPaneTab(page, 'Message');
    });

    await test.step('Close app and verify snapshot stores ws-request/body', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
      await expect.poll(() => fs.existsSync(snapshotPath)).toBe(true);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotRequestTab(snapshot, 'ReqWsSnapshot');
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('ws-request');
      expect(tab.request?.tab).toBe('body');
    });

    await test.step('Verify restore opens Message tab and avoids 404', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqWsSnapshot')).toBeVisible({ timeout: 15000 });
      await locators.tabs.requestTab('ReqWsSnapshot').click({ force: true });

      await expect(page2.getByTestId('responsive-tab-body')).toHaveAttribute('aria-selected', 'true');
      await expect(page2.locator('text=404 | Not found')).not.toBeVisible();

      await closeElectronApp(app2);
    });
  });

  test('graphql snapshot stores concrete type and query tab key', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-graphql-snapshot-type-tab-key');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and GraphQL request', async () => {
      await createCollection(page, 'TestCol', colPath);

      const locators = buildCommonLocators(page);
      await locators.sidebar.collection('TestCol').hover();
      await locators.actions.collectionActions('TestCol').click();
      await locators.dropdown.item('New Request').click();

      await page.getByTestId('graphql-request').click();
      await page.getByTestId('request-name').fill('ReqGraphSnapshot');
      await page.getByTestId('new-request-url').locator('.CodeMirror').click();
      await page.keyboard.type('https://echo.usebruno.com/graphql');
      await locators.modal.button('Create').click();

      await openRequest(page, 'TestCol', 'ReqGraphSnapshot', { persist: true });
      await selectRequestPaneTab(page, 'Headers');
    });

    await test.step('Close app and verify snapshot stores graphql-request/headers', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
      await expect.poll(() => fs.existsSync(snapshotPath)).toBe(true);

      const snapshot = readSnapshot(userDataPath);
      const tab = findSnapshotRequestTab(snapshot, 'ReqGraphSnapshot');
      expect(tab).toBeTruthy();
      expect(tab.type).toBe('graphql-request');
      expect(tab.request?.tab).toBe('headers');
    });

    await test.step('Verify restore opens Headers tab and avoids 404', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqGraphSnapshot')).toBeVisible({ timeout: 15000 });
      await locators.tabs.requestTab('ReqGraphSnapshot').click({ force: true });

      await expect(page2.getByTestId('responsive-tab-headers')).toHaveAttribute('aria-selected', 'true');
      await expect(page2.locator('text=404 | Not found')).not.toBeVisible();

      await closeElectronApp(app2);
    });
  });
});
