import { test, expect } from '../../playwright';
import { buildCommonLocators, createCollection, createRequest, closeAllCollections } from '../utils/page';

test.describe('Rename Collection Item - File Extension', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should show .yml extension for OpenCollection format when renaming a request', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const testDir = await createTmpDir('yml-rename-test');

    // Create a collection with OpenCollection (YAML) format
    await test.step('Create collection with OpenCollection format', async () => {
      await createCollection(page, 'YML Rename Test', testDir);
    });

    // Create a request inside the collection
    await createRequest(page, 'Test Request', 'YML Rename Test');

    // Open rename dialog via context menu
    await test.step('Open rename dialog and verify .yml extension', async () => {
      await locators.sidebar.request('Test Request').hover();
      await locators.actions.collectionItemActions('Test Request').click();
      await locators.dropdown.item('Rename').click();

      const renameModal = page.locator('.bruno-modal').filter({ hasText: 'Rename Request' });
      await renameModal.waitFor({ state: 'visible' });

      // Show filesystem name via Options dropdown
      await renameModal.locator('.btn-advanced').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Show Filesystem Name' }).click();

      // Click the IconEdit SVG to enable filename editing
      await renameModal.getByTestId('rename-request-edit-icon').click();

      // Verify the extension shows .yml, not .bru
      const extensionLabel = renameModal.locator('.file-extension');
      await expect(extensionLabel).toHaveText('.yml');

      // Close the rename modal
      await renameModal.getByRole('button', { name: 'Cancel' }).click();
    });
  });
});
