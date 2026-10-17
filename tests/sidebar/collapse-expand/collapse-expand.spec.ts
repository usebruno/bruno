import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, collapseFolder, expandFolder, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest, writeBruFolder } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'CollapseCol';

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  writeBruRequest(dir, 'top-req', { seq: 2 });

  const folderDir = writeBruFolder(dir, 'folder-a', 1);
  writeBruRequest(folderDir, 'child-1', { seq: 1 });
  writeBruRequest(folderDir, 'child-2', { seq: 2 });
};

test.describe('Sidebar collapse / expand', () => {
  test('collapsing a folder or collection removes its descendants; expanding restores them', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('collapse-expand'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const row = locators.sidebar.item;
    const collectionChevron = locators.sidebar.collectionChevron(COLLECTION_NAME);
    const tabs = locators.tabs.allRequestTabs();

    try {
      await test.step('Open the collection from its chevron', async () => {
        await collectionChevron.click();
        await expect(row('top-req')).toBeVisible({ timeout: 15000 });
        await expect(row('folder-a')).toBeVisible();
      });

      await test.step('Expand the folder', async () => {
        await expandFolder(page, 'folder-a');
        await expect(row('child-1')).toBeVisible();
        await expect(row('child-2')).toBeVisible();
      });

      await test.step('Collapsing the folder hides its children', async () => {
        await collapseFolder(page, 'folder-a');
        await expect(row('child-1')).toHaveCount(0);
        await expect(row('child-2')).toHaveCount(0);
        // The folder row itself is still there.
        await expect(row('folder-a')).toBeVisible();
      });

      await test.step('Re-expanding the folder restores its children', async () => {
        await expandFolder(page, 'folder-a');
        await expect(row('child-1')).toBeVisible();
        await expect(row('child-2')).toBeVisible();
      });

      await test.step('Collapsing the collection hides everything but its header', async () => {
        const tabsBefore = await tabs.count();

        await collectionChevron.click();
        await expect(row('top-req')).toHaveCount(0);
        await expect(row('folder-a')).toHaveCount(0);
        await expect(row('child-1')).toHaveCount(0);
        // The collection header row remains.
        await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
        // The chevron only toggles collapse, it must not open a collection-settings tab.
        await expect(tabs).toHaveCount(tabsBefore);
      });

      await test.step('Re-expanding the collection restores its items, folder state included', async () => {
        await collectionChevron.click();
        await expect(row('top-req')).toBeVisible();
        await expect(row('folder-a')).toBeVisible();

        await expect(row('child-1')).toBeVisible();
        await expect(row('child-2')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
