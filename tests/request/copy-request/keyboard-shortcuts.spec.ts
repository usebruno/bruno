import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createFolder, createRequest } from '../../utils/page';

test.describe.serial('Copy and Paste with Keyboard Shortcuts', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should copy and paste request using keyboard shortcuts', async ({ page, createTmpDir }) => {
    await createCollection(page, 'keyboard-test', await createTmpDir('keyboard-test'));
    await createRequest(page, 'test-request', 'keyboard-test', { url: 'https://echo.usebruno.com' });

    const collection = page.locator('.collection-name').filter({ hasText: 'keyboard-test' });
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
    await expect(page.getByText(/Request copied/i).first()).toBeVisible();

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

    await createFolder(page, 'test-folder', 'keyboard-test');

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
    await expect(page.getByText(/Folder copied/i).first()).toBeVisible();

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
