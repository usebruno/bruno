import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection } from '../../utils/page';

test.describe('Copy and Paste with Keyboard Shortcuts', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy and paste request using keyboard shortcuts', async ({ page, createTmpDir }) => {
    await createCollection(page, 'keyboard-test', await createTmpDir('keyboard-test'), { openWithSandboxMode: 'safe' });
    const collection = page.locator('.collection-name').filter({ hasText: 'keyboard-test' });

    // Create a request
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();

    const requestItem = page.locator('.collection-item-name').filter({ hasText: 'test-request' });
    await expect(requestItem).toBeVisible();

    // Focus the request item
    await requestItem.click();
    await requestItem.focus();

    // Wait for keyboard focus indicator
    await expect(requestItem).toHaveClass(/item-keyboard-focused/);

    // Use Cmd+C on Mac, Ctrl+C on Windows/Linux
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyC`);

    // Verify copy success (toast message)
    await expect(page.getByText(/copied to clipboard/i).first()).toBeVisible();

    // Focus the collection to paste
    await collection.click();
    await collection.focus();

    // Use Cmd+V on Mac, Ctrl+V on Windows/Linux
    await page.keyboard.press(`${modifier}+KeyV`);

    // Verify paste success
    await expect(page.getByText(/pasted successfully/i).first()).toBeVisible();

    // Verify the pasted request appears
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toHaveCount(2);
  });

  test('should copy and paste folder using keyboard shortcuts', async ({ page }) => {
    const collection = page.locator('.collection-name').filter({ hasText: 'keyboard-test' });

    // Create a folder
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    const folder = page.locator('.collection-item-name').filter({ hasText: 'test-folder' });
    await expect(folder).toBeVisible();

    // Focus the folder
    await folder.click();
    await folder.focus();

    // Wait for keyboard focus indicator
    await expect(folder).toHaveClass(/item-keyboard-focused/);

    // Use keyboard shortcut to copy
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyC`);

    // Verify copy success
    await expect(page.getByText(/copied to clipboard/i).first()).toBeVisible();

    // Focus the collection to paste
    await collection.click();
    await collection.focus();

    // Use keyboard shortcut to paste
    await page.keyboard.press(`${modifier}+KeyV`);

    // Verify paste success
    await expect(page.getByText(/pasted successfully/i).first()).toBeVisible();

    // Verify the pasted folder appears
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toHaveCount(2);
  });
});
