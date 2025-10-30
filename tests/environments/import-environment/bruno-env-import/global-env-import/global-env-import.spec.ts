import { test, expect } from '../../../../../playwright';
import path from 'path';

test.describe.serial('Global Environment Import Tests', () => {
  test('should import single global environment', async ({ pageWithUserData: page }) => {
    const singleEnvFile = path.join(__dirname, '../../../fixtures/environment-exports/local.json');

    await test.step('Open collection and clean up existing global environments', async () => {
      // Open the collection from sidebar
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Import Test Collection' }).click();

      // Clean up any existing global environments before test
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();

      // Check if there are existing environments to delete
      const existingEnvs = page.locator('.dropdown-item').filter({ hasText: /^(local|prod)$/ });
      const count = await existingEnvs.count();

      if (count > 0) {
        // Open global environment settings to delete existing environments
        await page.getByText('Configure', { exact: true }).click();

        // Delete all existing environments
        for (let i = 0; i < count; i++) {
          await page.getByTestId('delete-environment-button').click();
          // Confirm deletion if there's a confirmation dialog
          const confirmButton = page.getByRole('button', { name: 'Delete' });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.getByText('×').click();
          }
        }

        // Clean up any existing global environments before test
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
      }
    });

    await test.step('Navigate to global environment import', async () => {
      await expect(page.getByTestId('env-tab-global')).toHaveClass(/active/);
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      // Verify import modal opens
      const importModal = page.locator('[data-testid="import-global-environment-modal"]');
      await expect(importModal).toBeVisible();
    });

    await test.step('Import global environment file', async () => {
      // Import environment file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="import-global-environment"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(singleEnvFile);
    });

    await test.step('Verify imported global environment and variables', async () => {
      // The global environment settings modal should now be visible with the imported environment
      const envModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
      await expect(envModal).toBeVisible();

      // Verify imported variables
      await expect(page.getByRole('row', { name: 'host' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'secretToken' }).getByRole('cell').nth(1)).toBeVisible();

      // Close modal
      await page.getByText('×').click();
    });
  });

  test('should import multiple global environments', async ({ pageWithUserData: page }) => {
    const multiEnvFile = path.join(__dirname, '../../../fixtures/environment-exports/bruno-global-environments.json');

    await test.step('Open collection and clean up existing global environments', async () => {
      // Open the collection from sidebar
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Import Test Collection' }).click();

      // Clean up any existing global environments before test
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();

      // Check if there are existing environments to delete
      const existingEnvs = page.locator('.dropdown-item').filter({ hasText: /^(local|prod)$/ });
      const count = await existingEnvs.count();

      if (count > 0) {
        // Open global environment settings to delete existing environments
        await page.getByText('Configure', { exact: true }).click();

        // Delete all existing environments
        for (let i = 0; i < count; i++) {
          await page.getByTestId('delete-environment-button').click();
          // Confirm deletion if there's a confirmation dialog
          const confirmButton = page.getByRole('button', { name: 'Delete' });
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.getByText('×').click();
          }
        }

        // Clean up any existing global environments before test
        await page.getByTestId('environment-selector-trigger').click();
        await page.getByTestId('env-tab-global').click();
      }
    });

    await test.step('Navigate to global environment import', async () => {
      await page.getByText('Import', { exact: true }).click();

      // Verify import modal opens
      const importModal = page.locator('[data-testid="import-global-environment-modal"]');
      await expect(importModal).toBeVisible();
    });

    await test.step('Import multiple global environments file', async () => {
      // Import environment file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('[data-testid="import-global-environment"]').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(multiEnvFile);

      // The global environment settings modal should now be visible with the imported environments
      const envModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
      await expect(envModal).toBeVisible();
    });

    await test.step('Verify both global environments are available in selector', async () => {
      // Check that both environments are available in the selector
      await page.getByText('×').click(); // Close environment settings modal
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();

      // Verify both environments are in the dropdown
      await expect(page.locator('.dropdown-item').filter({ hasText: /^local$/ })).toBeVisible();
      await expect(page.locator('.dropdown-item').filter({ hasText: /^prod$/ })).toBeVisible();
    });

    await test.step('Test switching to prod environment and verify variables', async () => {
      // Test switching to prod environment
      await page.locator('.dropdown-item').filter({ hasText: 'prod' }).click();
      await expect(page.locator('.current-environment')).toContainText('prod');

      // Verify prod environment variables by opening settings again
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();
      await page.getByText('Configure', { exact: true }).click();
      const envModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });
      await expect(envModal).toBeVisible();

      // Verify imported variables
      await expect(page.getByRole('row', { name: 'host' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'secretToken' }).getByRole('cell').nth(1)).toBeVisible();

      // Close modal
      await page.getByText('×').click();
    });
  });
});
