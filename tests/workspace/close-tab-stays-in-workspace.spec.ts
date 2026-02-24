import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('Close tab stays in workspace', () => {
  test('after closing request tab, active tab is from current workspace', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('close-tab-workspace');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create two collections with one request each', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createCollection(page, 'ColB', colBPath);
      await createRequest(page, 'ReqA', 'ColA', { url: 'https://echo.usebruno.com', method: 'GET' });
      await createRequest(page, 'ReqB', 'ColB', { url: 'https://echo.usebruno.com', method: 'GET' });
    });

    await test.step('Open ReqA then ReqB so ReqB is the active tab', async () => {
      await openRequest(page, 'ColA', 'ReqA');
      await openRequest(page, 'ColB', 'ReqB');
      const locators = buildCommonLocators(page);
      await expect(locators.tabs.activeRequestTab()).toContainText('ReqB');
    });

    await test.step('Close ReqB tab', async () => {
      const locators = buildCommonLocators(page);
      await locators.tabs.closeTab('ReqB').click({ force: true });
    });

    await test.step('Active tab should be from current workspace (ReqA or workspace Overview/Environments)', async () => {
      const locators = buildCommonLocators(page);
      const activeTab = locators.tabs.activeRequestTab();
      await expect(activeTab).toBeVisible({ timeout: 5000 });
      await expect(activeTab).toContainText(/ReqA|Environments|Overview|My Workspace/);
    });

    await closeElectronApp(app);
  });
});
