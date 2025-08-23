import { test, expect } from '../../playwright';

test.describe('Cross-Collection Drag and Drop', () => {
  test('Verify cross-collection request drag and drop', async ({ pageWithUserData: page, createTmpDir }) => {
    test.setTimeout(120000); // Increase timeout for complex operations
    
    // Create first collection - click dropdown menu first
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('source-collection');
    await page.getByLabel('Location').fill(await createTmpDir('source-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    // Wait for collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a request in the first collection
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByPlaceholder('Request Name').fill('test-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://httpbin.org/get');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the request to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();

    // Create second collection - click dropdown menu first
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('target-collection');
    await page.getByLabel('Location').fill(await createTmpDir('target-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    // Wait for second collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for both collections to be visible in sidebar
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' })).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' })).toBeVisible();

    // Locate the request in source collection
    const sourceRequest = page.locator('.collection-item-name').filter({ hasText: 'test-request' });
    await expect(sourceRequest).toBeVisible();

    // Locate the target collection area (the collection name element)
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceRequest.dragTo(targetCollection);

    // Wait for the operation to complete
    await page.waitForTimeout(3000);

    // Verify the request has been moved to the target collection
    // Click on target collection to expand it if needed
    await page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' }).click();
    await page.waitForTimeout(1000);
    
    // Check that the request now appears under target collection
    const targetCollectionContainer = page.locator('.collection-name').filter({ hasText: 'target-collection' }).locator('..');
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();

    // Verify the request is no longer in the source collection
    const sourceCollectionContainer = page.locator('.collection-name').filter({ hasText: 'source-collection' }).locator('..');
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request' })).not.toBeVisible();
  });

});
