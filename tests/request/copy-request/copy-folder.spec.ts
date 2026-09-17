import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createFolder, createRequest, expandFolder } from '../../utils/page';

test.describe.serial('Copy and Paste Folders', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy and paste a folder within the same collection', async ({ page, createTmpDir }) => {
    await createCollection(page, 'test-collection', await createTmpDir('test-collection'));
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection' });

    await createFolder(page, 'folder-to-copy', 'test-collection');
    await expandFolder(page, 'folder-to-copy');
    await createRequest(page, 'request-in-folder', 'folder-to-copy', {
      url: 'https://echo.usebruno.com/test',
      inFolder: true
    });

    const folder = page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' });

    // Copy the folder
    await folder.hover();
    await folder.locator('.menu-icon').click({ force: true });
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
    await createCollection(page, 'test-collection-2', await createTmpDir('test-collection-2'));
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

    await createFolder(page, 'target-folder', 'test-collection-2');

    const targetFolder = page.locator('.collection-item-name').filter({ hasText: 'target-folder' });
    await expect(targetFolder).toBeVisible();
    await targetFolder.click();

    // Copy folder-to-copy
    await folderToCopy.hover();
    await folderToCopy.locator('.menu-icon').click({ force: true });
    await page.locator('.dropdown-item').filter({ hasText: 'Copy' }).click();
    await folderToCopy.click();

    // Paste into target folder
    await targetFolder.hover();
    await targetFolder.locator('.menu-icon').click({ force: true });
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify folder was pasted inside target folder
    await expect(page.locator('.collection-item-name').filter({ hasText: 'folder-to-copy' })).toHaveCount(4);
  });
});
