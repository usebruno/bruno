import { test, expect, ElectronApplication } from '../../../playwright';
import { buildCommonLocators } from '../../../pages';
import { restoreDocumentsPath, stubDocumentsPath } from '../../../utils';
import { clickApplicationMenuItem, clickTitleBarMenuItem } from '../../../pages/app-shell/title-bar';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  pressOpenCollectionShortcut,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';

test.describe('Open collection modal entry points', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async ({ pageWithUserData, reuseOrLaunchElectronApp, createTmpDir }, testInfo) => {
    electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await stubDocumentsPath(electronApp, await createTmpDir('entry-points-documents'));
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
    await restoreDocumentsPath(electronApp);
  });

  test('opens on Import with Cmd/Ctrl+O', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await pressOpenCollectionShortcut(page, 'import');

    await test.step('Verify the modal shows Import and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
      await expect(openCollectionModal.menuItem('import')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on Choose folder with Cmd/Ctrl+Shift+O', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await pressOpenCollectionShortcut(page, 'choose-folder');

    await test.step('Verify the modal shows Choose folder and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Choose folder');
      await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on Import with Cmd/Ctrl+O after the modal was last left on Recents', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Leave the modal on Recents', async () => {
      await showOpenCollectionModal(page, 'recents');
      await closeOpenCollectionModal(page);
    });

    await pressOpenCollectionShortcut(page, 'import');

    await test.step('Verify the modal shows Import and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
      await expect(openCollectionModal.menuItem('import')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on My computer from Open Collection on the workspace overview', async ({ pageWithUserData: page }) => {
    const { titleBar, workspaceOverview } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Go to the workspace overview', async () => {
      await titleBar.homeButton().click();
    });

    await test.step('Click Open Collection', async () => {
      await workspaceOverview.quickAction('Open Collection').click();
    });

    await test.step('Verify the modal shows My computer and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on Import from Import Collection on the workspace overview', async ({ pageWithUserData: page }) => {
    const { titleBar, workspaceOverview } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Go to the workspace overview', async () => {
      await titleBar.homeButton().click();
    });

    await test.step('Click Import Collection', async () => {
      await workspaceOverview.quickAction('Import Collection').click();
    });

    await test.step('Verify the modal shows Import and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
      await expect(openCollectionModal.menuItem('import')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on My computer from the Open link in the empty sidebar', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Verify the sidebar has no collections', async () => {
      await expect(sidebar.noCollectionsMessage()).toBeVisible();
    });

    await test.step('Click Open in the empty sidebar', async () => {
      await sidebar.noCollectionsOpenLink().click();
    });

    await test.step('Verify the modal shows My computer and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on My computer from Collection > Open Collection in the application menu', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await clickApplicationMenuItem(electronApp, 'Collection', 'Open Collection');

    await test.step('Verify the modal shows My computer and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('opens on My computer from File > Open Collection in the title bar menu', async ({ pageWithUserData: page }) => {
    test.skip(process.platform === 'darwin', 'The title bar menu only renders on Windows and Linux');
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await clickTitleBarMenuItem(page, 'file', 'open-collection');

    await test.step('Verify the modal shows My computer and marks it in the menu', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
      await expect(openCollectionModal.menuItem('my-computer')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('switches the open modal to My computer when the application menu opens a collection', async ({ pageWithUserData: page }) => {
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await pressOpenCollectionShortcut(page, 'import');
    await clickApplicationMenuItem(electronApp, 'Collection', 'Open Collection');

    await test.step('Verify the same modal now shows My computer', async () => {
      await expect(openCollectionModal.root()).toHaveCount(1);
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
    });
  });
});
