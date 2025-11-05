import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Cross-Collection Drag and Drop for folder', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify cross-collection folder drag and drop', async ({ page, createTmpDir }) => {
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

    // Create a folder in the first collection
    // Look for the collection menu button for the source collection specifically
    const sourceCollectionContainer1 = page.locator('.collection-name').filter({ hasText: 'source-collection' });
    await sourceCollectionContainer1.locator('.collection-actions').hover();
    await sourceCollectionContainer1.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();

    // Fill folder name in the modal
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the folder to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();

    // Add a request to the folder to make it more realistic
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).click({ button: 'right' });
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request-in-folder');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the request to be created
    await page.waitForTimeout(1000);

    // Expand the folder to see the request inside
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request-in-folder' })).toBeVisible();

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

    // Locate the folder in source collection
    const sourceFolder = page.locator('.collection-item-name').filter({ hasText: 'test-folder' });
    await expect(sourceFolder).toBeVisible();

    // Locate the target collection area (the collection name element)
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceFolder.dragTo(targetCollection);

    // Wait for the operation to complete
    await page.waitForTimeout(3000);

    // Verify the folder has been moved to the target collection
    // Click on target collection to expand it if needed
    await page.locator('#sidebar-collection-name').filter({ hasText: 'target-collection' }).click();
    await page.waitForTimeout(1000);

    // Check that the folder now appears under target collection
    const targetCollectionContainer = page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..');
    await expect(
      targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' })
    ).toBeVisible();

    // Expand the moved folder to verify the request inside is also moved
    await targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' }).click();
    await page.waitForTimeout(500);
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
    // Create first collection (source) - use unique names for this test
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

    // Create a folder in the first collection
    await page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..')
      .locator('.collection-actions')
      .hover();
    await page
      .locator('.collection-name')
      .filter({ hasText: 'source-collection' })
      .locator('..')
      .locator('.collection-actions .icon')
      .click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('folder-1');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-1' })).toBeVisible();

    // Add a request to the folder to make it more realistic
    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).click({ button: 'right' });
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('http-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();
    // Expand the folder to see the request inside
    await page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).click();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'http-request' })).toBeVisible();

    // Create second collection (target)
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

    // Create a folder with the same name in the target collection
    await page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..')
      .locator('.collection-actions')
      .hover();
    await page
      .locator('.collection-name')
      .filter({ hasText: 'target-collection' })
      .locator('..')
      .locator('.collection-actions .icon')
      .click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('folder-1');
    await page.getByRole('button', { name: 'Create' }).click();

    // Go back to source collection to drag the folder
    await page.locator('#sidebar-collection-name').filter({ hasText: 'source-collection' }).click();

    // Verify we have the folder to drag in the source collection
    const sourceFolder = page.locator('.collection-item-name').filter({ hasText: 'folder-1' }).first();
    await expect(sourceFolder).toBeVisible();

    // Locate the target collection area
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'target-collection' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceFolder.dragTo(targetCollection);

    // check for error toast notification
    await expect(page.getByText(/Error: Cannot copy.*already exists/i)).toBeVisible();

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
