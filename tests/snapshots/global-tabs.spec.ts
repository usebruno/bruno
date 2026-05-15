import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  createEnvironment,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Snapshot: Global Tab Restoration', () => {
  test('preferences and global environment tabs are restored and reusable after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-global-tabs');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await test.step('Create collection and open singleton tabs', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      await createEnvironment(page, 'GlobalSnapEnv', 'global');
      await expect(locators.tabs.requestTab('Global Environments')).toHaveCount(1);

      await locators.openPreferences().click();
      await expect(locators.tabs.requestTab('Preferences')).toHaveCount(1);
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify restored singleton tabs can be focused without duplication', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const locators2 = buildCommonLocators(page2);

      await expect(locators2.tabs.requestTab('Preferences')).toHaveCount(1, { timeout: 15000 });
      await expect(locators2.tabs.requestTab('Global Environments')).toHaveCount(1, { timeout: 15000 });

      await locators2.tabs.requestTab('Preferences').click();
      await expect(locators2.tabs.activeRequestTab()).toContainText('Preferences');

      await locators2.tabs.requestTab('Global Environments').click();
      await expect(locators2.tabs.activeRequestTab()).toContainText('Global Environments');

      await locators2.openPreferences().click();
      await expect(locators2.tabs.requestTab('Preferences')).toHaveCount(1);

      await closeElectronApp(app2);
    });
  });
});
