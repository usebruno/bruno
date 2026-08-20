import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createFolder, createRequest, expandFolder } from '../../utils/page';

test.describe('Cross-Collection Drag and Drop for folder', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify cross-collection folder drag and drop', async ({ page, createTmpDir }) => {
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));
    await createFolder(page, 'test-folder', 'source-collection');
    await expandFolder(page, 'test-folder');
    await createRequest(page, 'test-request-in-folder', 'test-folder', {
      url: 'https://echo.usebruno.com',
      inFolder: true
    });

    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    // Wait for both collections to be visible in sidebar
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' })).toBeVisible();

    // Locate the folder in source collection
    const sourceFolder = page.locator('.collection-item-name').filter({ hasText: 'test-folder' });
    await expect(sourceFolder).toBeVisible();

    // Locate the target collection area (the collection name element)
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceFolder.dragTo(targetCollection);

    // Verify the folder has been moved to the target collection
    const targetCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..');
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' })
    ).toBeVisible();

    // Expand the moved folder to verify the request inside is also moved
    await expandFolder(page, 'test-folder');
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request-in-folder' })
    ).toBeVisible();

    // Verify the folder is no longer in the source collection
    const sourceCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..');
    await expect(
      sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' })
    ).not.toBeVisible();

    // Verify the request is also no longer in the source collection
    await expect(
      sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request-in-folder' })
    ).not.toBeVisible();
  });

  test('Verify cross-collection folder drag and drop, a duplicate folder exist. expected to throw error toast', async ({
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

    // check for error toast notification
    await expect(page.getByText(/already exists in the target folder/i)).toBeVisible();

    // source and target collection request should remain unchanged
    const sourceCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..');
    await expect(
      sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'folder-1' })
    ).toBeVisible();
    await expect(
      sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'http-request' })
    ).toBeVisible();

    const targetCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..');
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'folder-1' })
    ).toBeVisible();
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'http-request' })
    ).not.toBeVisible();
  });
});
