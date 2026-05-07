import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  openRequest,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

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
});
