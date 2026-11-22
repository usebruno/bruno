import * as fs from 'fs';
import * as path from 'path';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, openCollectionFromDialog, removeCollection } from '../../../pages';
import { buildOpenCollectionModalLocators, closeOpenCollectionModal, showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import {
  buildRecentsLocators,
  openRecentCollection,
  selectRecentCollections,
  switchToRecentCollection
} from '../../../pages/open-collection-modal/recents';
import { restoreDocumentsPath, stubDocumentsPath, waitForReadyPage } from '../../../utils';

const INIT_USER_DATA_PATH = path.join(__dirname, 'init-user-data');
const ALPHA = 'Recent Alpha';
const BETA = 'Recent Beta';
const GAMMA = 'Recent Gamma';
const NO_MATCH_QUERY = 'no-such-collection';
const CLOSED_RECENTLY = /^Closed (just now|\d+m ago)$/;
const OPENED_RECENTLY = /^Opened (just now|\d+m ago)$/;

const recordRecentsHistory = async (page: Page, app: ElectronApplication, root: string) => {
  await test.step('Open Recent Beta and Recent Gamma, close Recent Beta, open Recent Alpha, then close Recent Gamma', async () => {
    await openCollectionFromDialog(page, app, [path.join(root, 'recent-beta'), path.join(root, 'recent-gamma')]);
    await removeCollection(page, BETA);
    await openCollectionFromDialog(page, app, path.join(root, 'recent-alpha'));
    await removeCollection(page, GAMMA);
  });

  await test.step('Wait for the toasts from opening and closing them to disappear', async () => {
    await expect(buildCommonLocators(page).toast.all()).toHaveCount(0);
  });
};

test.describe('Recents', () => {
  test.describe('before any collection is opened', () => {
    test.describe.configure({ mode: 'default' });

    let app: ElectronApplication;
    let page: Page;

    test.beforeAll(async ({ launchElectronApp, collectionFixturePath, createTmpDir }) => {
      app = await launchElectronApp({ initUserDataPath: INIT_USER_DATA_PATH, templateVars: { collectionPath: collectionFixturePath! } });
      page = await waitForReadyPage(app);
      await stubDocumentsPath(app, await createTmpDir('recents-documents'));
    });

    test.afterEach(async () => {
      await closeOpenCollectionModal(page);
    });

    test.afterAll(async () => {
      await restoreDocumentsPath(app);
      await closeElectronApp(app);
    });

    test('shows that no collection was opened yet', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Verify the empty state', async () => {
        await expect(recents.emptyStateTitle()).toHaveText('No collections opened yet');
      });
    });

    test('Open a collection folder leads to Choose folder', async () => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Click "Open a collection folder…"', async () => {
        await recents.openFolderButton().click();
      });

      await test.step('Verify the Choose folder page is shown', async () => {
        await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      });
    });

    test('Import it leads to Import', async () => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Click "Import it"', async () => {
        await recents.importLink().click();
      });

      await test.step('Verify the Import page is shown', async () => {
        await expect(openCollectionModal.pageView('import')).toBeVisible();
      });
    });

    test('Show collections on this computer leads to My computer', async () => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Click "Show collections on this computer"', async () => {
        await recents.showMyComputerButton().click();
      });

      await test.step('Verify the My computer page is shown', async () => {
        await expect(openCollectionModal.pageView('my-computer')).toBeVisible();
      });
    });
  });

  test.describe('after collections were opened and closed', () => {
    test.describe.configure({ mode: 'default' });

    let app: ElectronApplication;
    let page: Page;

    test.beforeAll(async ({ launchElectronApp, collectionFixturePath }) => {
      app = await launchElectronApp({ initUserDataPath: INIT_USER_DATA_PATH, templateVars: { collectionPath: collectionFixturePath! } });
      page = await waitForReadyPage(app);
      await recordRecentsHistory(page, app, collectionFixturePath!);
    });

    test.afterEach(async () => {
      await closeOpenCollectionModal(page);
    });

    test.afterAll(async () => {
      await closeAllCollections(page);
      await closeElectronApp(app);
    });

    test('lists the last closed collection first and open collections last', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Verify the order of the rows', async () => {
        await expect(recents.rowNames()).toHaveText([GAMMA, BETA, ALPHA]);
      });
    });

    test('marks each collection as closed or open', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Verify the closed collections say when they were closed and offer Open', async () => {
        await expect(recents.rowMeta(GAMMA)).toHaveText(CLOSED_RECENTLY);
        await expect(recents.rowOpenButton(GAMMA)).toHaveText('Open');
        await expect(recents.rowMeta(BETA)).toHaveText(CLOSED_RECENTLY);
        await expect(recents.rowOpenButton(BETA)).toHaveText('Open');
      });

      await test.step('Verify the open collection says when it was opened and offers Switch', async () => {
        await expect(recents.rowMeta(ALPHA)).toHaveText(OPENED_RECENTLY);
        await expect(recents.rowSwitchButton(ALPHA)).toHaveText('Switch');
      });
    });

    test('narrows the list to the collections matching the search', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Search for "alpha"', async () => {
        await recents.searchInput().fill('alpha');
      });

      await test.step('Verify only Recent Alpha is listed', async () => {
        await expect(recents.rowNames()).toHaveText([ALPHA]);
      });
    });

    test('lists every collection again when the search is cleared', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step('Search for "alpha"', async () => {
        await recents.searchInput().fill('alpha');
        await expect(recents.rowNames()).toHaveText([ALPHA]);
      });

      await test.step('Clear the search', async () => {
        await recents.searchClear().click();
      });

      await test.step('Verify the search is empty and every collection is listed', async () => {
        await expect(recents.searchInput()).toHaveValue('');
        await expect(recents.rowNames()).toHaveText([GAMMA, BETA, ALPHA]);
      });
    });

    test('explains when no collection matches the search', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step(`Search for "${NO_MATCH_QUERY}"`, async () => {
        await recents.searchInput().fill(NO_MATCH_QUERY);
      });

      await test.step('Verify no row is listed and the no-match message is shown', async () => {
        await expect(recents.rows()).toHaveCount(0);
        await expect(recents.noMatch()).toContainText(`No collection matches “${NO_MATCH_QUERY}”`);
        await expect(recents.noMatch()).toContainText('Recents only lists collections you have opened before. If it lives somewhere else, choose its folder.');
      });
    });

    test('Choose folder in the no-match message leads to Choose folder', async () => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');

      await test.step(`Search for "${NO_MATCH_QUERY}"`, async () => {
        await recents.searchInput().fill(NO_MATCH_QUERY);
      });

      await test.step('Click "Choose folder…" in the no-match message', async () => {
        await recents.noMatchChooseFolderButton().click();
      });

      await test.step('Verify the Choose folder page is shown', async () => {
        await expect(openCollectionModal.pageView('choose-folder')).toBeVisible();
      });
    });

    test('ticks the clicked collections and offers to open them together', async () => {
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await selectRecentCollections(page, [GAMMA, BETA]);

      await test.step('Verify both rows are ticked and the footer offers to open 2 collections', async () => {
        await expect(recents.rowCheckbox(GAMMA)).toBeChecked();
        await expect(recents.rowCheckbox(BETA)).toBeChecked();
        await expect(recents.openSelectedButton()).toHaveText('Open 2 collections');
      });
    });

    test('Cancel in the selection footer closes the modal without opening anything', async () => {
      const { sidebar } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await selectRecentCollections(page, [BETA]);

      await test.step('Click "Cancel" in the selection footer', async () => {
        await recents.cancelButton().click();
      });

      await test.step('Verify the modal closes and Recent Beta stays closed', async () => {
        await expect(openCollectionModal.root()).toBeHidden();
        await expect(sidebar.collection(BETA)).toHaveCount(0);
      });
    });
  });

  test.describe('opening collections from Recents', () => {
    test.describe.configure({ timeout: 60_000 });

    let app: ElectronApplication;
    let page: Page;

    test.beforeEach(async ({ launchElectronApp, collectionFixturePath }) => {
      app = await launchElectronApp({ initUserDataPath: INIT_USER_DATA_PATH, templateVars: { collectionPath: collectionFixturePath! } });
      page = await waitForReadyPage(app);
      await recordRecentsHistory(page, app, collectionFixturePath!);
    });

    test.afterEach(async () => {
      await closeOpenCollectionModal(page);
      await closeAllCollections(page);
      await closeElectronApp(app);
    });

    test('Open adds a closed collection to the workspace and closes the modal', async () => {
      const { sidebar, toast } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await openRecentCollection(page, BETA);

      await test.step('Verify Recent Beta opens in the sidebar and the modal closes', async () => {
        await expect(toast.byMessage('Collection added to workspace')).toBeVisible();
        await expect(openCollectionModal.root()).toBeHidden();
        await expect(sidebar.collection(BETA)).toBeVisible();
      });
    });

    test('lists a collection opened from Recents as open', async () => {
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await openRecentCollection(page, BETA);
      await test.step('Wait for the modal to close', async () => {
        await expect(openCollectionModal.root()).toBeHidden();
      });

      await showOpenCollectionModal(page, 'recents');

      await test.step('Verify Recent Beta says it was opened and offers Switch', async () => {
        await expect(recents.rowMeta(BETA)).toHaveText(OPENED_RECENTLY);
        await expect(recents.rowSwitchButton(BETA)).toHaveText('Switch');
      });
    });

    test('opens every ticked collection from the selection footer', async () => {
      const { sidebar, toast } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await selectRecentCollections(page, [GAMMA, BETA]);

      await test.step('Click "Open 2 collections"', async () => {
        await recents.openSelectedButton().click();
      });

      await test.step('Verify both collections open in the sidebar and the modal closes', async () => {
        await expect(toast.byMessage('Collections added to workspace')).toBeVisible();
        await expect(openCollectionModal.root()).toBeHidden();
        await expect(sidebar.collection(GAMMA)).toBeVisible();
        await expect(sidebar.collection(BETA)).toBeVisible();
      });
    });

    test('Switch reveals an open collection and shows its settings', async () => {
      const { sidebar, tabs } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);

      await showOpenCollectionModal(page, 'recents');
      await switchToRecentCollection(page, ALPHA);

      await test.step('Verify the modal closes on the settings of Recent Alpha', async () => {
        await expect(openCollectionModal.root()).toBeHidden();
        await expect(tabs.activeRequestTab()).toContainText('Collection');
        await expect(sidebar.emptyStateCta(ALPHA)).toBeVisible();
      });
    });

    test('a collection whose folder is gone fails to open and leaves Recents', async ({ collectionFixturePath }) => {
      const { toast } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const recents = buildRecentsLocators(page);

      await test.step('Delete the folder of Recent Gamma', async () => {
        await fs.promises.rm(path.join(collectionFixturePath!, 'recent-gamma'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      });

      await showOpenCollectionModal(page, 'recents');
      await openRecentCollection(page, GAMMA);

      await test.step('Verify opening fails, the modal stays on Recents and Recent Gamma leaves the list', async () => {
        await expect(toast.byMessage('Failed to open 1 collection')).toBeVisible();
        await expect(openCollectionModal.pageView('recents')).toBeVisible();
        await expect(recents.rowNames()).toHaveText([BETA, ALPHA]);
      });
    });
  });
});
