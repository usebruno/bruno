import { test, expect } from '../../../playwright';

test.describe('Close All Collections', () => {
  test('should show close all icon when collections exist and sidebar is hovered', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    // Verify collections are visible
    const collections = page.locator('#sidebar-collection-name');
    await expect(collections.first()).toBeVisible();

    // Hover over sidebar to show close all icon
    const sidebar = page.locator('.sidebar');
    await sidebar.hover();

    // Verify close all icon appears
    const closeAllButton = page.getByRole('button', { name: 'Close all collections' });
    await expect(closeAllButton).toBeVisible();
  });

  test('should not show close all icon when sidebar is not hovered', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    // Verify collections are visible
    const collections = page.locator('#sidebar-collection-name');
    await expect(collections.first()).toBeVisible();

    // Don't hover - icon should not be visible
    const closeAllButton = page.getByRole('button', { name: 'Close all collections' });
    await expect(closeAllButton).not.toBeVisible();
  });

  test('should close all collections when confirmed', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    // Verify collections exist
    const initialCollections = page.locator('#sidebar-collection-name');
    await expect(initialCollections.first()).toBeVisible();

    // Hover and click close all icon
    const sidebar = page.locator('.sidebar');
    await sidebar.hover();

    const closeAllButton = page.getByRole('button', { name: 'Close all collections' });
    await closeAllButton.click();

    // Verify confirmation modal appears
    const confirmModal = page.locator('.bruno-modal').filter({ hasText: 'Close All Collections' });
    await expect(confirmModal).toBeVisible();

    // Click "Close All" to confirm
    const confirmButton = page.getByRole('button', { name: 'Close All' });
    await confirmButton.click();

    // Verify toast notification and collections are closed
    await expect(page.getByText('Closed all collections')).toBeVisible();
    await expect(initialCollections).not.toBeVisible();
  });

  test('should cancel closing all collections', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    const initialCollections = page.locator('#sidebar-collection-name');
    const initialCount = await initialCollections.count();

    // Hover and click close all icon
    const sidebar = page.locator('.sidebar');
    await sidebar.hover();

    const closeAllButton = page.getByRole('button', { name: 'Close all collections' });
    await closeAllButton.click();

    // Click "Cancel" to dismiss
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();

    // Verify collections are still visible
    await expect(initialCollections).toHaveCount(initialCount);
  });

  test('should show unsaved changes modal when collections have drafts', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    // Open a collection and modify a request to create a draft
    const firstCollection = page.locator('#sidebar-collection-name').first();
    await firstCollection.click();
    await page.getByRole('button', { name: 'Save' }).waitFor();
    await page.getByRole('button', { name: 'Save' }).click();

    const requestItem = page.locator('.collection-item-name').first();
    if (await requestItem.count() > 0) {
      await requestItem.click();
      const urlInput = page.locator('#request-url');
      if (await urlInput.isVisible()) {
        await urlInput.fill('https://example.com/modified');
      }
    }

    // Hover and click close all
    const sidebar = page.locator('.sidebar');
    await sidebar.hover();
    const closeAllButton = page.getByRole('button', { name: 'Close all collections' });
    await closeAllButton.click();

    // Verify unsaved changes modal appears
    const unsavedChangesModal = page.locator('.bruno-modal').filter({ hasText: 'Unsaved changes' });
    await expect(unsavedChangesModal).toBeVisible();
    await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();
  });
});
