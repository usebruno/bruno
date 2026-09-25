import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import {
  buildCommonLocators,
  collapseFolder,
  expandFolder,
  openRequest,
  waitForReadyPage
} from '../../utils/page';
import { initBruCollection, writeBruFolder, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'RevealCol';
const EXAMPLE_NAME = 'saved-ok';

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  writeBruRequest(dir, 'top-req', { seq: 2 });
  writeBruRequest(dir, 'examples-req', { seq: 3, examples: [EXAMPLE_NAME] });

  const folderA = writeBruFolder(dir, 'folder-a', 1);
  const folderB = writeBruFolder(folderA, 'folder-b', 1);
  writeBruRequest(folderB, 'deep-req', { seq: 1 });
};

test.describe('Sidebar auto-reveal', () => {
  test('activating a tab expands its collapsed ancestors, and a manual collapse is never undone', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const collectionDir = path.join(await createTmpDir('auto-reveal'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const row = locators.sidebar.item;
    const collectionChevron = locators.sidebar.collectionChevron(COLLECTION_NAME);

    try {
      await test.step('Open the collection and both requests as persistent tabs', async () => {
        await collectionChevron.click();
        await expect(row('folder-a')).toBeVisible({ timeout: 15000 });

        await expandFolder(page, 'folder-a');
        await expandFolder(page, 'folder-b');
        await openRequest(page, COLLECTION_NAME, 'deep-req', { persist: true });
        await openRequest(page, COLLECTION_NAME, 'top-req', { persist: true });
        await expect(locators.tabs.activeRequestTab()).toContainText('top-req');
      });

      await test.step('Collapsing a folder hides the nested request', async () => {
        await collapseFolder(page, 'folder-a');
        await expect(row('folder-b')).toHaveCount(0);
        await expect(row('deep-req')).toHaveCount(0);
      });

      await test.step('Activating its tab expands both ancestor folders', async () => {
        await locators.tabs.requestTab('deep-req').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');

        await expect(row('folder-b')).toBeVisible();
        await expect(row('deep-req')).toBeVisible();
        await expect(row('deep-req')).toBeInViewport();
      });

      await test.step('Collapsing a folder holding the active request keeps it collapsed', async () => {
        await collapseFolder(page, 'folder-a');
        await expect(row('deep-req')).toHaveCount(0);

        await page.waitForTimeout(500);
        await expect(row('deep-req')).toHaveCount(0);
        await expect(row('folder-b')).toHaveCount(0);
      });

      await test.step('Collapsing the collection around the active request keeps it collapsed', async () => {
        await collectionChevron.click();
        await expect(row('folder-a')).toHaveCount(0);

        await page.waitForTimeout(500);
        await expect(row('folder-a')).toHaveCount(0);
        await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
      });

      await test.step('Clicking the already-active tab reveals it again', async () => {
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');

        await locators.tabs.requestTab('deep-req').click();
        await expect(row('folder-a')).toBeVisible();
        await expect(row('deep-req')).toBeVisible();
        await expect(row('deep-req')).toBeInViewport();
      });

      await test.step('Re-activating the tab expands the collection and the whole path', async () => {
        await collapseFolder(page, 'folder-a');
        await expect(row('deep-req')).toHaveCount(0);

        await locators.tabs.requestTab('top-req').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('top-req');

        await locators.tabs.requestTab('deep-req').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('deep-req');

        await expect(row('folder-a')).toBeVisible();
        await expect(row('folder-b')).toBeVisible();
        await expect(row('deep-req')).toBeVisible();
      });

      await test.step('Activating a response-example tab expands its parent request', async () => {
        await locators.sidebar.requestExamplesToggle('examples-req').click();
        await expect(locators.sidebar.example(EXAMPLE_NAME)).toBeVisible();
        await locators.sidebar.example(EXAMPLE_NAME).dblclick();
        await expect(locators.tabs.activeRequestTab()).toContainText(EXAMPLE_NAME);

        await locators.sidebar.requestExamplesToggle('examples-req').click();
        await expect(locators.sidebar.example(EXAMPLE_NAME)).toHaveCount(0);

        await locators.tabs.requestTab('top-req').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('top-req');

        await locators.tabs.requestTab(EXAMPLE_NAME).click();
        await expect(locators.sidebar.example(EXAMPLE_NAME)).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
