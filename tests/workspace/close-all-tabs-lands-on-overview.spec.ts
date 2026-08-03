import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  waitForReadyPage
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Close all tabs lands on workspace overview', () => {
  test('closing the last request tab focuses the workspace Overview tab', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('close-all-tabs-overview');
    const collectionPath = await createTmpDir('col-overview');

    let app;
    try {
      app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      await test.step('Create a collection and open two requests', async () => {
        await createCollection(page, 'ColOverview', collectionPath);
        await createRequest(page, 'ReqOne', 'ColOverview', { url: 'https://echo.usebruno.com', method: 'GET' });
        await createRequest(page, 'ReqTwo', 'ColOverview', { url: 'https://echo.usebruno.com', method: 'GET' });
        await openRequest(page, 'ColOverview', 'ReqOne', { persist: true });
        await openRequest(page, 'ColOverview', 'ReqTwo', { persist: true });
        await expect(locators.tabs.requestTab('ReqOne')).toBeVisible();
        await expect(locators.tabs.requestTab('ReqTwo')).toBeVisible();
      });

      await test.step('Close both request tabs', async () => {
        await locators.tabs.closeTab('ReqTwo').click({ force: true });
        await expect(locators.tabs.requestTab('ReqTwo')).toHaveCount(0);
        await locators.tabs.closeTab('ReqOne').click({ force: true });
        await expect(locators.tabs.requestTab('ReqOne')).toHaveCount(0);
      });

      await test.step('Active tab must be the workspace Overview, not Environments', async () => {
        const activeTab = locators.tabs.activeRequestTab();
        await expect(activeTab).toBeVisible({ timeout: 5000 });
        await expect(activeTab.locator('.tab-label')).toHaveText('Overview');
        await expect(activeTab.locator('.tab-label')).not.toHaveText('Environments');
      });
    } finally {
      if (app) await closeElectronApp(app);
    }
  });
});
