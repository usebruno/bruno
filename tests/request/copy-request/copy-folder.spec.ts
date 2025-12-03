import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection } from '../../utils/page';

test.describe('Copy and Paste Folders', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy and paste a folder within the same collection', async ({ page, createTmpDir }) => {
    await createCollection(page, 'test-collection', await createTmpDir('test-collection'), { openWithSandboxMode: 'safe' });
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection' });

    // Create a new folder with a request inside
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await page.locator('#folder-name').fill('folder-to-copy');
    await page.getByRole('button', { name: 'Create' }).click();

    const folder = page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' });
    await expect(folder).toBeVisible();

    // Add a request to the folder
    await folder.hover();
    await folder.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('request-in-folder');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://echo.usebruno.com/test');
    await page.getByRole('button', { name: 'Create' }).click();

    await folder.click();
    await expect(page.locator('.collection-item-name').filter({ hasText: 'request-in-folder' })).toBeVisible();

    // Copy the folder
    await folder.hover();
    await folder.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Copy' }).click();

    // Paste into the collection root
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify the pasted folder appears
    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' })).toHaveCount(2);
  });

  test('should copy and paste a folder into a different collection', async ({ page, createTmpDir }) => {
    // Create second collection
    await createCollection(page, 'test-collection-2', await createTmpDir('test-collection-2'), { openWithSandboxMode: 'safe' });
    const collection2 = page.locator('.collection-name').filter({ hasText: 'test-collection-2' });

    // Paste the folder from clipboard into the new collection
    await collection2.hover();
    await collection2.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify the pasted folder appears in the new collection
    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' })).toHaveCount(3);
  });

  test('should paste folder into another folder', async ({ page }) => {
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection-2' });
    const folderToCopy = page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' }).first();

    // Create a target folder
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await page.locator('#folder-name').fill('target-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    const targetFolder = page.locator('.collection-item-name').filter({ hasText: 'target-folder' });
    await expect(targetFolder).toBeVisible();
    await targetFolder.click();

    // Copy folder-to-copy
    await folderToCopy.hover();
    await folderToCopy.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Copy' }).click();
    await folderToCopy.click();

    // Paste into target folder
    await targetFolder.hover();
    await targetFolder.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify folder was pasted inside target folder
    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' })).toHaveCount(4);
  });
});
