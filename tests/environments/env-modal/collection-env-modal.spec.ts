import { test, expect } from '../../../playwright';

test.describe('Collection Environment Modal Tests', () => {
  test('should create collection and access environment modal', async ({ pageWithUserData: page, createTmpDir }) => {
    // Create a test collection first
    await page.locator('.dropdown-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create Collection' }).click();
    await page.getByLabel('Name').fill('env-modal-test-collection');

    await page.getByLabel('Location').fill(await createTmpDir('env-modal-test-collection'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Wait for collection to appear and click on it
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'env-modal-test-collection' })).toBeVisible();
    await page.locator('#sidebar-collection-name').filter({ hasText: 'env-modal-test-collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Open environment dropdown
    await page.locator('div.current-environment').click();

    // Verify the Collection tab is active by default
    await expect(page.locator('.tab-button.active').filter({ hasText: 'Collection' })).toBeVisible();

    // For a new collection with no environments, we should see empty state with create option
    const createButton = page.getByText('Create', { exact: true });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill environment name
      const environmentNameInput = page.locator('input[name="name"]');
      await expect(environmentNameInput).toBeVisible();
      await environmentNameInput.fill('Test Environment');

      // Save the environment
      await page.getByRole('button', { name: 'Create' }).click();

      // Verify we're back in the dropdown and can see the environment
      await expect(page.locator('.current-environment').filter({ hasText: 'Test Environment' })).toBeVisible();
    }

    // Close dropdown
    await page.keyboard.press('Escape');
  });
});