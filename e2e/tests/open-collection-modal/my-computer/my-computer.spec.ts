import * as fs from 'fs';
import * as path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import { buildCommonLocators, closeAllCollections } from '../../../pages';
import { initBruCollection, restoreDocumentsPath, stubDocumentsPath, waitForReadyPage } from '../../../utils';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal, pressOpenCollectionShortcut } from '../../../pages/open-collection-modal/shell';
import { buildImportPageLocators } from '../../../pages/open-collection-modal/import-page';
import {
  buildMyComputerLocators,
  forgetMyComputerBannerDismissal,
  openMyComputerCollection,
  rescanMyComputer,
  selectMyComputerCollections,
  showMyComputer,
  switchToMyComputerCollection
} from '../../../pages/open-collection-modal/my-computer';

const NO_MATCH_TEXT = 'Bruno may not search the folder it lives in. Choose its folder to open it, or add the folder to your search locations.';

test.describe('My computer', () => {
  test.describe.configure({ mode: 'default' });

  let electronApp: ElectronApplication;
  let fixtureRoot: string;

  test.beforeAll(async ({ pageWithUserData, collectionFixturePath, reuseOrLaunchElectronApp }, testInfo) => {
    fixtureRoot = collectionFixturePath!;
    electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    await stubDocumentsPath(electronApp, path.join(fixtureRoot, 'documents'));
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeOpenCollectionModal(page);
    await closeAllCollections(page);
    await forgetMyComputerBannerDismissal(page);
    await fs.promises.rm(path.join(fixtureRoot, 'search-a', 'zeta'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  test.afterAll(async () => {
    await restoreDocumentsPath(electronApp);
  });

  test('counts the locations it searched once the scan finishes', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the subtitle counts the four locations with Manage and Rescan next to it', async () => {
      await expect(myComputer.scanStatus()).toHaveText('Collections found in 4 locations ·');
      await expect(myComputer.manageButton()).toBeVisible();
      await expect(myComputer.rescanButton()).toBeVisible();
    });
  });

  test('lists the collections it finds in path order', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the rows are sorted by collection path', async () => {
      await expect(myComputer.rowNames()).toHaveText(['Default Location Collection', 'Documents Collection', 'Alpha API', 'Beta API']);
    });
  });

  test('skips collections in dependency and hidden folders', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the collections under bower_components and .hidden are not listed', async () => {
      await expect(myComputer.row('Bower Widget')).toHaveCount(0);
      await expect(myComputer.row('Hidden Collection')).toHaveCount(0);
    });
  });

  test('shortens a long collection path to its last two folders', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the Beta API row path ends with …/deep/beta', async () => {
      await expect(myComputer.rowPath('Beta API')).toHaveText(/\/…\/deep\/beta$/);
    });
  });

  test('shows when a collection that was never opened was last modified', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the Beta API row shows when it was modified', async () => {
      await expect(myComputer.rowMeta('Beta API')).toHaveText(/^Modified /);
    });
  });

  test('filters the collections by the search text', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Search for "Beta API"', async () => {
      await myComputer.searchInput().fill('Beta API');
    });

    await test.step('Verify only Beta API is listed', async () => {
      await expect(myComputer.rowNames()).toHaveText(['Beta API']);
    });
  });

  test('says when no collection matches the search', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Search for "zzz"', async () => {
      await myComputer.searchInput().fill('zzz');
    });

    await test.step('Verify the no-match message replaces the rows', async () => {
      await expect(myComputer.rows()).toHaveCount(0);
      await expect(myComputer.noMatchTitle()).toHaveText('No collection matches “zzz”');
      await expect(myComputer.noMatch()).toContainText(NO_MATCH_TEXT);
    });
  });

  test('goes to Choose folder from the no-match message', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Search for "zzz" and click Choose folder in the no-match message', async () => {
      await myComputer.searchInput().fill('zzz');
      await myComputer.noMatchChooseFolderButton().click();
    });

    await test.step('Verify the modal shows Choose folder', async () => {
      await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('goes to Choose folder when its shortcut is pressed in the search box', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Search for "Beta API"', async () => {
      await myComputer.searchInput().fill('Beta API');
    });

    await test.step('Verify the search box has focus', async () => {
      await expect(myComputer.searchInput()).toBeFocused();
    });

    await pressOpenCollectionShortcut(page, 'choose-folder', { keepFocus: true });

    await test.step('Verify the modal shows Choose folder', async () => {
      await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('goes to Import when its shortcut is pressed in the search box, with focus in its text box', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);
    const importPage = buildImportPageLocators(page);

    await showMyComputer(page);

    await test.step('Search for "Beta API"', async () => {
      await myComputer.searchInput().fill('Beta API');
    });

    await test.step('Verify the search box has focus', async () => {
      await expect(myComputer.searchInput()).toBeFocused();
    });

    await pressOpenCollectionShortcut(page, 'import', { keepFocus: true });

    await test.step('Verify the Import text box has focus', async () => {
      await expect(importPage.textInput()).toBeFocused();
    });
  });

  test('opens Locations from the banner and goes back', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Verify My computer shows the search locations banner', async () => {
      await expect(myComputer.banner()).toBeVisible();
    });

    await test.step('Click Manage locations in the banner', async () => {
      await myComputer.bannerManageButton().click();
    });

    await test.step('Verify the modal shows Locations', async () => {
      await expect(openCollectionModal.pageView('locations')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Locations');
    });

    await test.step('Click Back', async () => {
      await openCollectionModal.backButton().click();
    });

    await test.step('Verify the modal shows My computer again', async () => {
      await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('My computer');
    });
  });

  test('keeps the banner hidden after it is dismissed', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Dismiss the banner', async () => {
      await myComputer.bannerDismissButton().click();
    });

    await test.step('Verify the banner is hidden', async () => {
      await expect(myComputer.banner()).toBeHidden();
    });

    await test.step('Close the modal and show My computer again', async () => {
      await closeOpenCollectionModal(page);
      await showMyComputer(page);
    });

    await test.step('Verify the list shows without the banner', async () => {
      await expect(myComputer.list()).toBeVisible();
      await expect(myComputer.banner()).toBeHidden();
    });
  });

  test('opens a collection from its Open button', async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await openMyComputerCollection(page, 'Alpha API');

    await test.step('Verify the collection is added to the workspace and the modal closes', async () => {
      await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Alpha API')).toBeVisible();
    });
  });

  test('lists an open collection after the others with a Switch button', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Open Alpha API from My computer', async () => {
      await showMyComputer(page);
      await openMyComputerCollection(page, 'Alpha API');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await showMyComputer(page);

    await test.step('Verify Alpha API moves after the closed collections', async () => {
      await expect(myComputer.rowNames()).toHaveText(['Default Location Collection', 'Documents Collection', 'Beta API', 'Alpha API']);
    });

    await test.step('Verify Alpha API offers Switch instead of a checkbox and says when it was opened', async () => {
      await expect(myComputer.rowSwitchButton('Alpha API')).toHaveText('Switch');
      await expect(myComputer.rowOpenButton('Alpha API')).toHaveCount(0);
      await expect(myComputer.rowCheckbox('Alpha API')).toHaveCount(0);
      await expect(myComputer.rowMeta('Alpha API')).toHaveText('Opened just now');
    });
  });

  test('switches to an open collection and shows its settings', async ({ pageWithUserData: page }) => {
    const { tabs } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await test.step('Open Alpha API from My computer', async () => {
      await showMyComputer(page);
      await openMyComputerCollection(page, 'Alpha API');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await showMyComputer(page);

    await switchToMyComputerCollection(page, 'Alpha API');

    await test.step('Verify the modal closes on the collection settings tab', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(tabs.activeRequestTab()).toContainText('Collection');
    });
  });

  test('opens the selected collections together', async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await selectMyComputerCollections(page, ['Alpha API', 'Default Location Collection']);

    await test.step('Verify the footer offers to open both collections', async () => {
      await expect(myComputer.openSelectedButton()).toHaveText('Open 2 collections');
    });

    await test.step('Click Open 2 collections', async () => {
      await myComputer.openSelectedButton().click();
    });

    await test.step('Verify both collections are added to the workspace and the modal closes', async () => {
      await expect(toast.byMessage('Collections added to workspace')).toBeVisible();
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Alpha API')).toBeVisible();
      await expect(sidebar.collection('Default Location Collection')).toBeVisible();
    });
  });

  test('closes without opening the selected collection on Cancel', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await selectMyComputerCollections(page, ['Documents Collection']);

    await test.step('Click Cancel', async () => {
      await myComputer.cancelButton().click();
    });

    await test.step('Verify the modal closes and the collection stays closed', async () => {
      await expect(openCollectionModal.root()).toBeHidden();
      await expect(sidebar.collection('Documents Collection')).toHaveCount(0);
    });
  });

  test('finds a collection added since the last scan when Rescan is clicked', async ({ pageWithUserData: page }) => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Add Zeta API to search-a on disk', async () => {
      initBruCollection(path.join(fixtureRoot, 'search-a', 'zeta'), 'Zeta API');
    });

    await test.step('Verify Zeta API is not listed before the rescan', async () => {
      await expect(myComputer.row('Zeta API')).toHaveCount(0);
    });

    await rescanMyComputer(page);

    await test.step('Verify Zeta API is listed', async () => {
      await expect(myComputer.row('Zeta API')).toBeVisible();
    });
  });
});

test.describe('My computer without collections', () => {
  test.describe.configure({ mode: 'default' });

  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async ({ launchElectronApp, collectionFixturePath, createTmpDir }) => {
    electronApp = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data-empty'),
      templateVars: { collectionPath: collectionFixturePath! }
    });
    await stubDocumentsPath(electronApp, await createTmpDir('my-computer-empty-documents'));
    page = await waitForReadyPage(electronApp);
  });

  test.afterEach(async () => {
    await closeOpenCollectionModal(page);
  });

  test.afterAll(async () => {
    await closeElectronApp(electronApp);
  });

  test('says it found no collections and how many locations it searched', async () => {
    const myComputer = buildMyComputerLocators(page);

    await showMyComputer(page);

    await test.step('Verify the empty state', async () => {
      await expect(myComputer.emptyStateTitle()).toHaveText('No collections found on this computer');
      await expect(myComputer.emptyState()).toContainText('Bruno searched 2 locations. Open a collection folder from anywhere, or add more places to search.');
    });
  });

  test('goes to Choose folder from the empty state', async () => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Click Open a collection folder…', async () => {
      await myComputer.openFolderButton().click();
    });

    await test.step('Verify the modal shows Choose folder', async () => {
      await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      await expect(openCollectionModal.menuItem('choose-folder')).toHaveAttribute('aria-current', 'page');
    });
  });

  test('goes to Locations from the empty state', async () => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Click Manage search locations', async () => {
      await myComputer.manageLocationsButton().click();
    });

    await test.step('Verify the modal shows Locations', async () => {
      await expect(openCollectionModal.pageView('locations')).toBeVisible();
      await expect(openCollectionModal.pageTitle()).toHaveText('Locations');
    });
  });

  test('goes to Import from the empty state', async () => {
    const myComputer = buildMyComputerLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);

    await showMyComputer(page);

    await test.step('Click Import it', async () => {
      await myComputer.importLink().click();
    });

    await test.step('Verify the modal shows Import', async () => {
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(openCollectionModal.menuItem('import')).toHaveAttribute('aria-current', 'page');
    });
  });
});
