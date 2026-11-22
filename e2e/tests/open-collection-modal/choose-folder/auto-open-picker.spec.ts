import * as fs from 'fs';
import * as path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import { mockBrowseFiles } from '../../../pages';
import { waitForReadyPage } from '../../../utils';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import { buildChooseFolderLocators } from '../../../pages/open-collection-modal/choose-folder';

const autoOpenUserDataPath = path.join(__dirname, 'init-user-data-auto-open');

const readAutoOpenFolderPicker = (userDataPath: string) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(userDataPath, 'preferences.json'), 'utf8')).preferences.openCollection.autoOpenFolderPicker;
  } catch {
    return undefined;
  }
};

test.describe('Choose folder: open the folder picker when the tab opens', () => {
  let app: ElectronApplication;
  let page: Page;
  let userDataPath: string;

  test.beforeEach(async ({ launchElectronApp, createTmpDir }) => {
    userDataPath = await createTmpDir('auto-open-picker-userdata');
    app = await launchElectronApp({ initUserDataPath: autoOpenUserDataPath, userDataPath });
    page = await waitForReadyPage(app);
  });

  test.afterEach(async () => {
    await closeElectronApp(app);
  });

  test('opens the folder picker as soon as Choose folder opens', async ({ collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Make the folder picker pick the parent folder', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
    });

    await pressOpenCollectionShortcut(page, 'choose-folder');

    await test.step('Verify the picked folder is listed without clicking the choose link', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('opens the folder picker again when you come back to Choose folder', async ({ collectionFixturePath }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Open Choose folder and let the folder picker pick the parent folder', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
      await pressOpenCollectionShortcut(page, 'choose-folder');
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });

    await test.step('Make the folder picker pick a folder without collections', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'not-a-collection')]);
    });

    await test.step('Go to Import and back to Choose folder', async () => {
      await showOpenCollectionModal(page, 'import');
      await showOpenCollectionModal(page, 'choose-folder');
    });

    await test.step('Verify the new pick replaced the list', async () => {
      await expect(openCollectionModal.note()).toContainText('not-a-collection isn’t a Bruno collection.');
      await expect(chooseFolder.list()).toHaveCount(0);
    });
  });

  test('saves the setting off and then opens the picker only from the choose link', async ({ collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Open Choose folder and cancel the folder picker', async () => {
      await mockBrowseFiles(app, []);
      await pressOpenCollectionShortcut(page, 'choose-folder');
    });

    await test.step('Verify the setting is on', async () => {
      await expect(chooseFolder.autoOpenPickerCheckbox()).toBeChecked();
    });

    await test.step('Untick the setting', async () => {
      await chooseFolder.autoOpenPickerCheckbox().uncheck();
    });

    await test.step('Verify the setting is saved off', async () => {
      await expect(chooseFolder.autoOpenPickerCheckbox()).not.toBeChecked();
      await expect.poll(() => readAutoOpenFolderPicker(userDataPath)).toBe(false);
    });

    await test.step('Reopen Choose folder', async () => {
      await closeOpenCollectionModal(page);
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
      await pressOpenCollectionShortcut(page, 'choose-folder');
    });

    await test.step('Verify Choose folder waits on its start page', async () => {
      await expect(chooseFolder.autoOpenPickerCheckbox()).not.toBeChecked();
      await expect(chooseFolder.list()).toHaveCount(0);
    });

    await test.step('Click the choose link', async () => {
      await chooseFolder.chooseLink().click();
    });

    await test.step('Verify the folder picked from the link is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('keeps the setting off after a restart', async ({ launchElectronApp, collectionFixturePath }) => {
    await test.step('Turn the setting off', async () => {
      await mockBrowseFiles(app, []);
      await pressOpenCollectionShortcut(page, 'choose-folder');
      await buildChooseFolderLocators(page).autoOpenPickerCheckbox().uncheck();
      await expect.poll(() => readAutoOpenFolderPicker(userDataPath)).toBe(false);
    });

    await test.step('Restart the app with the same user data', async () => {
      await closeElectronApp(app);
      app = await launchElectronApp({ userDataPath });
      page = await waitForReadyPage(app);
    });

    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Open Import and switch to Choose folder', async () => {
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
      await pressOpenCollectionShortcut(page, 'import');
      await showOpenCollectionModal(page, 'choose-folder');
    });

    await test.step('Verify the setting is still off and Choose folder waits on its start page', async () => {
      await expect(chooseFolder.autoOpenPickerCheckbox()).not.toBeChecked();
      await expect(chooseFolder.list()).toHaveCount(0);
    });

    await test.step('Click the choose link', async () => {
      await chooseFolder.chooseLink().click();
    });

    await test.step('Verify the folder picked from the link is listed', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });

  test('saves the setting on again and opens the picker on the next visit', async ({ collectionFixturePath }) => {
    const chooseFolder = buildChooseFolderLocators(page);

    await test.step('Turn the setting off', async () => {
      await mockBrowseFiles(app, []);
      await pressOpenCollectionShortcut(page, 'choose-folder');
      await chooseFolder.autoOpenPickerCheckbox().uncheck();
      await expect.poll(() => readAutoOpenFolderPicker(userDataPath)).toBe(false);
    });

    await test.step('Tick the setting', async () => {
      await chooseFolder.autoOpenPickerCheckbox().check();
    });

    await test.step('Verify the setting is saved on', async () => {
      await expect(chooseFolder.autoOpenPickerCheckbox()).toBeChecked();
      await expect.poll(() => readAutoOpenFolderPicker(userDataPath)).toBe(true);
    });

    await test.step('Reopen Choose folder', async () => {
      await closeOpenCollectionModal(page);
      await mockBrowseFiles(app, [path.join(collectionFixturePath!, 'parent')]);
      await pressOpenCollectionShortcut(page, 'choose-folder');
    });

    await test.step('Verify the folder picker opened by itself', async () => {
      await expect(chooseFolder.rowNames()).toHaveText(['Parent Alpha', 'Parent Beta']);
    });
  });
});
