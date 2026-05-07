import { test, expect, closeElectronApp, type Page } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Snapshot: Sidebar-Tab Restoration', () => {
  test('open tabs are restored after app restart and tied to the sidebar items', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-state');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

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
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

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
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

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
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1, { timeout: 15000 });

      await openRequest(page2, 'TestCol', 'ReqAlpha');
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);

      await openRequest(page2, 'TestCol', 'ReqAlpha', { persist: true });
      await expect(locators.tabs.requestTab('ReqAlpha')).toHaveCount(1);

      await closeElectronApp(app2);
    });
  });
});
