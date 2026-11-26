import * as path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { restoreDocumentsPath, stubDocumentsPath, waitForReadyPage } from '../../../utils';
import { buildChooseFolderLocators } from '../../../pages/open-collection-modal/choose-folder';
import { showLocations } from '../../../pages/open-collection-modal/my-computer';
import {
  buildOpenCollectionModalLocators,
  clickOutsideOpenCollectionModal,
  closeOpenCollectionModal,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';

const INIT_USER_DATA_PATH = path.join(__dirname, 'init-user-data');

test.describe('Open collection modal reopens on the last page', () => {
  test.beforeAll(async ({ pageWithUserData, reuseOrLaunchElectronApp, createTmpDir }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await stubDocumentsPath(app, await createTmpDir('documents'));
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
  });

  test.afterAll(async ({ reuseOrLaunchElectronApp }, testInfo) => {
    await restoreDocumentsPath(await reuseOrLaunchElectronApp({ testFile: testInfo.file }));
  });

  test('reopens on Recents after the close button closed it there', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show Recents and close the modal with the close button', async () => {
      await showOpenCollectionModal(page, 'recents');
      await closeOpenCollectionModal(page);
    });

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on Recents', async () => {
      await expect(openCollectionModal.pageView('recents')).toBeVisible();
      await expect(openCollectionModal.menuItem('recents')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('reopens on My computer after Escape closed it there', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show My computer and close the modal with Escape', async () => {
      await showOpenCollectionModal(page, 'my-computer');
      await page.keyboard.press('Escape');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on My computer', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('reopens on My computer after the close button closed it on Locations', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showLocations(page);

    await test.step('Verify Locations shows Back and keeps My computer marked in the menu', async () => {
      await expect(openCollectionModal.pageView('locations')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Locations');
      await expect(openCollectionModal.backButton()).toBeVisible();
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });

    await closeOpenCollectionModal(page);

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on My computer without Back', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
      await expect(openCollectionModal.backButton()).toBeHidden();
    });
  });

  test('goes back from Locations to My computer without closing', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showLocations(page);

    await test.step('Click Back', async () => {
      await openCollectionModal.backButton().click();
    });

    await test.step('Verify the modal stays open on My computer', async () => {
      await expect(openCollectionModal.root()).toBeVisible();
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
    });
  });

  test('reopens on Registry after a backdrop click closed it there', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show Registry and close the modal with a backdrop click', async () => {
      await showOpenCollectionModal(page, 'registry');
      await clickOutsideOpenCollectionModal(page);
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on Registry', async () => {
      await expect(openCollectionModal.pageView('registry')).toBeVisible();
      await expect(openCollectionModal.menuItem('registry')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('reopens on API Catalog after Escape closed it there', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Show API Catalog and close the modal with Escape', async () => {
      await showOpenCollectionModal(page, 'api-catalog');
      await page.keyboard.press('Escape');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on API Catalog', async () => {
      await expect(openCollectionModal.pageView('api-catalog')).toBeVisible();
      await expect(openCollectionModal.menuItem('api-catalog')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('reopens on Import after the import shortcut opened it', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Leave the modal on Recents', async () => {
      await showOpenCollectionModal(page, 'recents');
      await closeOpenCollectionModal(page);
    });

    await test.step('Open Import with the import shortcut and close the modal', async () => {
      await pressOpenCollectionShortcut(page, 'import');
      await closeOpenCollectionModal(page);
    });

    await test.step('Click the folder icon in the sidebar header', async () => {
      await sidebar.openCollectionButton().click();
    });

    await test.step('Verify the modal reopens on Import', async () => {
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.menuItem('import')).toHaveAttribute('aria-current', 'page');
    });
  });
});

test.describe('Open collection modal page on launch', () => {
  test('opens on Choose folder the first time', async ({ launchElectronApp, collectionFixturePath }) => {
    const app = await launchElectronApp({
      initUserDataPath: INIT_USER_DATA_PATH,
      templateVars: { collectionPath: collectionFixturePath! }
    });

    try {
      const page = await waitForReadyPage(app);
      const { sidebar } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const chooseFolder = buildChooseFolderLocators(page);

      await test.step('Click the folder icon in the sidebar header', async () => {
        await sidebar.openCollectionButton().click();
      });

      await test.step('Verify the modal opens on Choose folder with its drop zone', async () => {
        await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
        await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
        await expect(chooseFolder.dropZone()).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('opens on Choose folder again after a restart', async ({ launchElectronApp, createTmpDir, collectionFixturePath }) => {
    const userDataPath = await createTmpDir('last-page-restart');
    let app = await launchElectronApp({
      initUserDataPath: INIT_USER_DATA_PATH,
      userDataPath,
      templateVars: { collectionPath: collectionFixturePath! }
    });

    try {
      await test.step('Leave the modal on Recents', async () => {
        const page = await waitForReadyPage(app);
        await showOpenCollectionModal(page, 'recents');
        await closeOpenCollectionModal(page);
      });

      await test.step('Restart the app with the same user data', async () => {
        await closeElectronApp(app);
        app = await launchElectronApp({ userDataPath });
      });

      const page = await waitForReadyPage(app);
      const { sidebar } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await test.step('Click the folder icon in the sidebar header', async () => {
        await sidebar.openCollectionButton().click();
      });

      await test.step('Verify the modal opens on Choose folder', async () => {
        await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
        await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
