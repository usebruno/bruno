import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, createCollection, createFolder } from '../../utils/page';

test.describe('Add folder under collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-117: Verify Adding a new folder under collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'add-folder-collection';
    const folderName = 'orders';
    const collectionLocation = await createTmpDir('add-folder');
    const { sidebar } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Add a new folder under the collection', async () => {
      await createFolder(page, folderName, collectionName);
    });

    await test.step('Folder is listed under the collection', async () => {
      await expect(sidebar.scopedItem(collectionName, folderName)).toBeVisible();
    });

    await test.step('Folder is written to the collection on disk', async () => {
      const folderFilePath = path.join(collectionLocation, collectionName, folderName, 'folder.yml');
      await expect
        .poll(() => (fs.existsSync(folderFilePath) ? fs.readFileSync(folderFilePath, 'utf8') : ''))
        .toMatch(new RegExp(`name: ${folderName}$`, 'm'));
    });
  });
});
