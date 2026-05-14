import { test, expect, closeElectronApp, type Page } from '../../playwright';
import {
  createCollection,
  createExampleFromSidebar,
  createRequest,
  openExampleFromSidebar,
  openRequest,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Snapshot: Sidebar-Tab Restoration', () => {
  test('open tabs are restored after app restart and tied to the sidebar items', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-state');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection with a request open it', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });
    });

    await test.step('Close and restart app', async () => {
      // Wait for debounced snapshot save to flush
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify tabs have opened and are tied to the sidebar', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const locators = buildCommonLocators(page2);
      await openRequest(page2, 'TestCol', 'ReqAlpha', { persist: true });

      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);

      await closeElectronApp(app2);
    });
  });

  test('restored request tab is reused on subsequent sidebar clicks', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-reuse');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and keep one request tab open', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Click request from sidebar and reuse existing tab', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1, { timeout: 15000 });

      await openRequest(page2, 'TestCol', 'ReqAlpha');
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);

      await openRequest(page2, 'TestCol', 'ReqAlpha', { persist: true });
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);

      await closeElectronApp(app2);
    });
  });

  test('when request and example are open, last active request restores as active after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-request-active-over-example');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create request, create example, then make request last active', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      await createExampleFromSidebar(page, 'ReqAlpha', 'Example One');
      await expect(page.getByTestId('response-example-title')).toHaveText('ReqAlpha / Example One');

      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      const locators = buildCommonLocators(page);
      await expect(locators.tabs.activeRequestTab()).toContainText('ReqAlpha');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify request restores as active and request click does not focus example', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.activeRequestTab()).toContainText('ReqAlpha', { timeout: 15000 });

      await openRequest(page2, 'TestCol', 'ReqAlpha', { persist: true });
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);
      await expect(page2.getByTestId('response-example-title')).not.toBeVisible();

      await closeElectronApp(app2);
    });
  });

  test('when last active tab is an example, it restores as active after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-example-active-restore');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create request and example, then make example active', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      await createExampleFromSidebar(page, 'ReqAlpha', 'Example One');
      await openExampleFromSidebar(page, 'ReqAlpha', 'Example One');
      await expect(page.getByTestId('response-example-title')).toHaveText('ReqAlpha / Example One');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify example restores as active', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page2.getByTestId('response-example-title')).toHaveText('ReqAlpha / Example One', { timeout: 15000 });

      await closeElectronApp(app2);
    });
  });

  test('when duplicate example names exist, snapshot restores the same active example by index', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-duplicate-example-restore');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create request and two examples with duplicate names, then activate second', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      await createExampleFromSidebar(page, 'ReqAlpha', 'DupExample', 'first-desc');
      await createExampleFromSidebar(page, 'ReqAlpha', 'DupExample', 'second-desc');
      await openExampleFromSidebar(page, 'ReqAlpha', 'DupExample', 1);
      await expect(page.getByTestId('response-example-description')).toHaveText('second-desc');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify second duplicate example restores as active', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page2.getByTestId('response-example-title')).toHaveText('ReqAlpha / DupExample', { timeout: 15000 });
      await expect(page2.getByTestId('response-example-description')).toHaveText('second-desc');

      await closeElectronApp(app2);
    });
  });
});
