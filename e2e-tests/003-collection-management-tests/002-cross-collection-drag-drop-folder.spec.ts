import { test, expect } from '../../playwright';

test.describe('Cross-Collection Drag and Drop for folder', () => {
  test('Verify cross-collection folder drag and drop', async ({ pageWithUserData: page, createTmpDir }) => {
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
    // Look for the collection menu button (usually three dots or similar)
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    
    // Fill folder name in the modal
    await expect(page.locator('#collection-name')).toBeVisible();
    await page.locator('#collection-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the folder to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();

    // Add a request to the folder to make it more realistic
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).click({ button: 'right' });
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request-in-folder');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://httpbin.org/get');
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
    const targetCollectionContainer = page.locator('.collection-name').filter({ hasText: 'target-collection' }).locator('..');
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();
    
    // Expand the moved folder to verify the request inside is also moved
    await targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' }).click();
    await page.waitForTimeout(500);
    await expect(targetCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request-in-folder' })).toBeVisible();

    // Verify the folder is no longer in the source collection
    const sourceCollectionContainer = page.locator('.collection-name').filter({ hasText: 'source-collection' }).locator('..');
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-folder' })).not.toBeVisible();
    
    // Verify the request is also no longer in the source collection
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'test-request-in-folder' })).not.toBeVisible();
  });

test.skip('Verify cross-collection folder drag and drop, a duplicate folder exist. expected to rename the dropped folder', async ({ pageWithUserData: page, createTmpDir }) => {
    // Create first collection (source) - use unique names for this test
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('rename-test-source');
    await page.getByLabel('Location').fill(await createTmpDir('rename-test-source'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    // Wait for collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-source' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-source' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a folder in the first collection
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await expect(page.locator('#collection-name')).toBeVisible();
    await page.locator('#collection-name').fill('duplicate-folder');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the folder to be created and appear in the sidebar
    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' })).toBeVisible();

    // Add a request to the folder to make it more realistic
    await page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' }).click({ button: 'right' });
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request-in-duplicate-folder');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://httpbin.org/get');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the request to be created
    await page.waitForTimeout(1000);
    
    // Expand the folder to see the request inside
    await page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request-in-duplicate-folder' })).toBeVisible();

    // Create second collection (target)
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('rename-test-target');
    await page.getByLabel('Location').fill(await createTmpDir('rename-test-target'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    
    // Wait for second collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-target' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-target' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create a folder with the same name in the target collection
    await page.locator('.collection-actions').hover();
    await page.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await expect(page.locator('#collection-name')).toBeVisible();
    await page.locator('#collection-name').fill('duplicate-folder');
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Wait for the folder to be created
    await page.waitForTimeout(2000);

    // Go back to source collection to drag the folder
    await page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-source' }).click();
    await page.waitForTimeout(1000);

    // Verify we have the folder to drag in the source collection
    const sourceFolder = page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' }).first();
    await expect(sourceFolder).toBeVisible();

    // Locate the target collection area
    const targetCollection = page.locator('.collection-name').filter({ hasText: 'rename-test-target' });
    await expect(targetCollection).toBeVisible();

    // Perform drag and drop operation
    await sourceFolder.dragTo(targetCollection);

    // Wait for the operation to complete
    await page.waitForTimeout(5000);

    // Click on target collection to ensure it's expanded and verify the results
    await page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-target' }).click();
    await page.waitForTimeout(2000);
    
    // Wait for any folders to appear in the target collection
    await page.waitForSelector('.collection-item-name', { timeout: 10000 });
    
    // Focus on verifying the specific behavior rather than total counts
    // We should have both the original folder and the renamed folder
    
    // Check for the renamed folder first (more specific pattern)
    await expect(page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder (1)' })).toHaveCount(1);
    
    // Check that we have at least one original "duplicate-folder" (without parentheses)
    const foldersWithoutParentheses = page.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' }).filter({ hasText: /^(?!.*\(\d+\)).*$/ });
    await expect(foldersWithoutParentheses).toHaveCount(1);

    // Verify the folder is no longer in the source collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'rename-test-source' }).click();
    await page.waitForTimeout(2000);
    
    // The source collection should now be empty (the folder was moved)
    const sourceCollectionContainer = page.locator('.collection-name').filter({ hasText: 'rename-test-source' }).locator('..');
    await expect(sourceCollectionContainer.locator('.collection-item-name').filter({ hasText: 'duplicate-folder' })).toHaveCount(0);
  })
});
