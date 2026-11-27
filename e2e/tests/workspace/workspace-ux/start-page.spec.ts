import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { waitForReadyPage } from '../../../utils';

const initUserDataPath = path.join(__dirname, 'init-user-data');

test.describe('Start page', () => {
  test('the start page links and create-new row open their flows', async ({ launchElectronApp, createTmpDir }) => {
    const wsLocation = await createTmpDir('start-page');
    const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
    const page = await waitForReadyPage(app);
    const { tabs, modal, sidebar, startPage } = buildCommonLocators(page);
    const overviewTab = tabs.workspaceTab('workspaceOverview');

    const closeOverview = async () => {
      await tabs.closeTabIcon(overviewTab).click({ force: true });
      await expect(startPage.root()).toBeVisible();
    };

    try {
      await test.step('Closing Overview shows the start page', async () => {
        await closeOverview();
      });

      await test.step('"Workspace overview" reopens Overview', async () => {
        await startPage.link('overview').click();
        await expect(overviewTab).toBeVisible();
        await closeOverview();
      });

      await test.step('"Open or import collection" → "Import collection" opens the import dialog', async () => {
        await startPage.link('open-or-import').click();
        await startPage.link('import').click();
        await expect(modal.byTitle('Import Collection')).toBeVisible();
        await modal.closeButton().click();
        await expect(modal.byTitle('Import Collection')).toHaveCount(0);
      });

      await test.step('"Clone a collection from Git" opens the clone dialog', async () => {
        await startPage.link('clone').click();
        await expect(modal.byTitle('Clone Git Repository')).toBeVisible();
        await modal.closeButton().click();
        await expect(modal.byTitle('Clone Git Repository')).toHaveCount(0);
      });

      await test.step('"New collection" shows the collection name input in the sidebar', async () => {
        await startPage.createButton('collection').click();
        await expect(sidebar.inlineCollectionCreator.nameInput()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(sidebar.inlineCollectionCreator.nameInput()).toHaveCount(0);
      });

      await test.step('"New HTTP request" opens an unsaved request tab', async () => {
        await startPage.createButton('http').click();

        await expect(tabs.activeRequestTab()).toContainText('Untitled');
        await expect(startPage.root()).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
