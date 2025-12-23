import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest } from '../../utils/page';

test.describe('Cross-Collection Drag and Drop', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify request drag and drop', async ({ page, createTmpDir }) => {
    const requestName = 'drag-drop-request';

    // Create first collection - open with sandbox mode
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));

    // Create a request in the first collection using the dialog/modal flow
    await createRequest(page, requestName, 'source-collection', { url: 'https://echo.usebruno.com' });

    // Create second collection - open with sandbox mode
    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' })).toBeVisible();

    // Locate the request in source collection
    const sourceCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..');
    const sourceRequest = sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await expect(sourceRequest).toBeVisible();

    // Locate the target collection area (the collection name element)
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceRequest.dragTo(targetCollection);

    // Verify the request has been moved to the target collection
    // Check that the request now appears under target collection
    const targetCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..');
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();

    // Verify the request is no longer in the source collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toHaveCount(0);
  });

  test('Expected to show error toast message, when duplicate request found in drop location', async ({
    page,
    createTmpDir
  }) => {
    const requestName = 'duplicate-request';

    // Create first collection (source-collection)
    await createCollection(page, 'source-collection', await createTmpDir('source-collection'));

    // Create a request in the first collection using the dialog/modal flow
    await createRequest(page, requestName, 'source-collection', { url: 'https://echo.usebruno.com' });

    // Create second collection (target-collection)
    await createCollection(page, 'target-collection', await createTmpDir('target-collection'));

    // Create a request with the same name in the target collection using the dialog/modal flow
    await createRequest(page, requestName, 'target-collection', { url: 'https://echo.usebruno.com' });

    // Go back to source collection to drag the request
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();

    const sourceCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..');
    const targetCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..');

    const sourceRequest = sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName }).first();
    await expect(sourceRequest).toBeVisible();

    // Locate the target collection area
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation to target-collection
    await sourceRequest.dragTo(targetCollection);

    // check for error toast notification
    await expect(page.getByText(/Error: Cannot copy.*already exists/i)).toBeVisible();

    // source and target collection request should remain unchanged
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' }).click();
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: requestName })).toBeVisible();
  });
});
