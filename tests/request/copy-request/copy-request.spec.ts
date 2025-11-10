import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection } from '../../utils/page';

test.describe('Copy and Paste Requests', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy and paste a request within the same collection', async ({ page, createTmpDir }) => {
    await createCollection(page, 'test-collection', await createTmpDir('test-collection'), { openWithSandboxMode: 'safe' });

    // Create a new request
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection' });
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('original-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toBeVisible();

    // Copy the request
    const requestItem = page.locator('.collection-item-name').filter({ hasText: 'original-request' });
    await requestItem.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Copy' }).click();

    // Paste into the collection root
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify the pasted request appears with the same name
    await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toHaveCount(2);
  });

  test('should paste request into a folder', async ({ page, createTmpDir }) => {
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection' });
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    // Paste into the folder
    const folder = page.locator('.collection-item-name').filter({ hasText: 'test-folder' });
    await folder.click();
    await folder.hover();
    await folder.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    await page.waitForTimeout(2000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toHaveCount(3);
  });

  test('should copy and paste a request into a different collection', async ({ page, createTmpDir }) => {
    await createCollection(page, 'test-collection-2', await createTmpDir('test-collection-2'), { openWithSandboxMode: 'safe' });
    const collection = page.locator('.collection-name').filter({ hasText: 'test-collection-2' });

    // Paste into the collection root
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Paste' }).click();

    // Verify the pasted request appears with the same name
    await expect(page.locator('.collection-item-name').filter({ hasText: 'original-request' })).toHaveCount(4);
  });
});
