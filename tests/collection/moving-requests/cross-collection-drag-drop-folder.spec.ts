import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandCollection,
  expandFolder,
  openCollectionFromDialog
} from '../../utils/page';

test.describe('Cross-Collection Drag and Drop for folder', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('TC-493: Verify the Requests remians unchanged after folder moving from one to another collection', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { sidebar } = buildCommonLocators(page);
    const folderName = 'test-folder';
    const requestNames = ['request-1', 'request-2', 'request-3'];

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, 'source-collection'));
    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, 'target-collection'));
    await sidebar.collection('source-collection').waitFor({ state: 'visible' });
    await sidebar.collection('target-collection').waitFor({ state: 'visible' });
    await expandCollection(page, 'source-collection');

    await test.step('Drag the folder from the source collection onto the target collection', async () => {
      const sourceFolder = sidebar.itemRowIn('source-collection', folderName);
      await sourceFolder.waitFor({ state: 'visible' });
      const targetCollection = sidebar.collectionRow('target-collection');
      await sourceFolder.dragTo(targetCollection);
    });

    await test.step('The folder and its requests are gone from the source collection', async () => {
      await expect(sidebar.itemsIn('source-collection', folderName)).toHaveCount(0);
      for (const requestName of requestNames) {
        await expect(sidebar.itemsIn('source-collection', requestName)).toHaveCount(0);
      }
    });

    await test.step('The moved folder keeps the requests in their original order', async () => {
      await expandCollection(page, 'target-collection');
      await expandFolder(page, folderName);
      await expect(sidebar.folderItemNames('target-collection', folderName)).toHaveText(requestNames);
    });
  });

  test('Verify cross-collection folder drag and drop when a duplicate folder exists: silently suffixes the directory', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));
    await createFolder(page, 'folder-1', 'source-collection');
    await expandFolder(page, 'folder-1');
    await createRequest(page, 'http-request', 'folder-1', {
      url: 'https://echo.usebruno.com',
      inFolder: true
    });

    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));
    await createFolder(page, 'folder-1', 'target-collection');

    // Verify we have the folder to drag in the source collection
    const sourceFolder = page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).first();
    await expect(sourceFolder).toBeVisible();

    // Locate the target collection area
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceFolder.dragTo(targetCollection);

    await expect(page.getByText(/already exists/i)).toHaveCount(0);
    // The folder is moved out of the source collection.
    const sourceCollectionContainer = page.locator('[data-collection-id="source-collection"]');
    await expect(
      sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'folder-1' })
    ).toHaveCount(0);

    // The target now shows two "folder-1" entries (the original and the moved one;
    // the directory name was silently suffixed on disk).
    const targetCollectionContainer = page.locator('[data-collection-id="target-collection"]');
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'folder-1' })
    ).toHaveCount(2);

    await expect(page.getByText(/already exists/i)).toHaveCount(0);
  });
});
