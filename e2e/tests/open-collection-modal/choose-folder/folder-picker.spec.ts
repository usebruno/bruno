import * as path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import { mockBrowseFiles } from '../../../pages';
import { waitForReadyPage } from '../../../utils';
import {
  buildOpenCollectionModalLocators,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import { buildChooseFolderLocators } from '../../../pages/open-collection-modal/choose-folder';

test.describe('Choose folder: when the folder picker opens', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({ launchElectronApp }) => {
    app = await launchElectronApp();
    page = await waitForReadyPage(app);
  });

  test.afterEach(async () => {
    await closeElectronApp(app);
  });

  test('opens the folder picker from the Choose folder shortcut', async ({ collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Make the folder picker pick the parent folder', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
    });

    await pressOpenCollectionShortcut(page, 'choose-folder');

    await test.step('Verify the picked folder is listed without clicking the choose link', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('shows the start page without the folder picker when its menu item is clicked', async ({ collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Make the folder picker pick the parent folder', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
    });

    await showOpenCollectionModal(page, 'import');
    await showOpenCollectionModal(page, 'choose-folder');

    await test.step('Verify Choose folder waits on its start page', async () => {
      await expect(openCollectionModal.pageTitle()).toHaveText('Choose folder');
      await expect(chooseFolder.dropZone()).toBeVisible();
      await expect(chooseFolder.list()).toHaveCount(0);
    });

    await test.step('Click the choose link', async () => {
      await chooseFolder.chooseLink().click();
    });

    await test.step('Verify the folder picked from the link is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });
});
