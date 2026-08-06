import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, expandFolder } from '../../utils/page';
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
    const page = await app.firstWindow();
    const locators = buildCommonLocators(page);
    const row = (name: string) => page.locator('.collection-item-name').filter({ hasText: name });
    const collectionChevron = locators.sidebar.collectionRow(COLLECTION_NAME).locator('.chevron-icon');
    const folderChevron = locators.folder.chevron('folder-a');

    try {
      await test.step('Open the collection', async () => {
        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(row('top-req')).toBeVisible({ timeout: 15000 });
        await expect(row('folder-a')).toBeVisible();
      });

      await test.step('Collapsing the folder hides its children', async () => {
        await expandFolder(page, 'folder-a');
        await expect(row('child-1')).toBeVisible();
        await expect(row('child-2')).toBeVisible();

        await folderChevron.click();
        await expect(row('child-1')).toHaveCount(0);
        await expect(row('child-2')).toHaveCount(0);
        // The folder row itself is still there.
        await expect(row('folder-a')).toBeVisible();
      });

      await test.step('Re-expanding the folder restores its children', async () => {
        await folderChevron.click();
        await expect(row('child-1')).toBeVisible();
        await expect(row('child-2')).toBeVisible();
      });

      await test.step('Collapsing the collection hides everything but its header', async () => {
        await collectionChevron.click();
        await expect(row('top-req')).toHaveCount(0);
        await expect(row('folder-a')).toHaveCount(0);
        await expect(row('child-1')).toHaveCount(0);
        // The collection header row remains.
        await expect(locators.sidebar.collection(COLLECTION_NAME)).toBeVisible();
      });

      await test.step('Re-expanding the collection restores its top-level items', async () => {
        await collectionChevron.click();
        await expect(row('top-req')).toBeVisible();
        await expect(row('folder-a')).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
