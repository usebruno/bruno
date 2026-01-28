import { test, expect } from '../../../../../playwright';
import path from 'path';
import fs from 'fs';

test.describe.serial('Collection Environment Import Tests', () => {
  test('should import single collection environment', async ({ pageWithUserData: page }) => {
    const singleEnvFile = path.join(__dirname, '../../../fixtures/environment-exports/local.json');
    const collectionPath = path.join(__dirname, 'fixtures/collection');
    const environmentsPath = path.join(collectionPath, 'environments');

    await test.step('Clean up existing environments and open collection', async () => {
      // Clean up any existing environments folder before test
      if (fs.existsSync(environmentsPath)) {
        fs.rmSync(environmentsPath, { recursive: true, force: true });
      }

      // Open the collection from sidebar
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Import Test Collection' }).click();
    });

    await test.step('Navigate to collection environment import', async () => {
      // Open environment import
      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-collection').click();
      await expect(page.getByTestId('env-tab-collection')).toHaveClass(/active/);
      await page.getByText('Import', { exact: true }).click();

      // Verify import modal opens
      const importModal = page.locator('[data-testid="import-environment-modal"]');
      await expect(importModal).toBeVisible();
    });

    await test.step('Import environment file', async () => {
      // Import environment file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByTestId('import-environment').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(singleEnvFile);
    });

    await test.step('Verify imported environment and variables', async () => {
      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      await expect(page.getByRole('row', { name: 'host' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'secretToken' }).getByRole('cell').nth(1)).toBeVisible();

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click();
    });

    await test.step('Clean up after test', async () => {
      // Clean up any existing environments folder before test
      if (fs.existsSync(environmentsPath)) {
        fs.rmSync(environmentsPath, { recursive: true, force: true });
      }
    });
  });

  test('should import multiple collection environments', async ({ pageWithUserData: page }) => {
    const multiEnvFile = path.join(__dirname, '../../../fixtures/environment-exports/bruno-collection-environments.json');
    const collectionPath = path.join(__dirname, 'fixtures/collection');
    const environmentsPath = path.join(collectionPath, 'environments');

    await test.step('Clean up existing environments and open collection', async () => {
      // Clean up any existing environments folder before test
      if (fs.existsSync(environmentsPath)) {
        fs.rmSync(environmentsPath, { recursive: true, force: true });
      }

      // Open the collection from sidebar
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Environment Import Test Collection' }).click();
    });

    await test.step('Navigate to collection environment import', async () => {
      // Open environment import

      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();

      await page.getByTestId('env-tab-collection').click();
      await expect(page.getByTestId('env-tab-collection')).toHaveClass(/active/);
      await page.getByText('Import', { exact: true }).click();

      // Verify import modal opens
      const importModal = page.locator('[data-testid="import-environment-modal"]');
      await expect(importModal).toBeVisible();
    });

    await test.step('Import multiple environments file', async () => {
      // Import environment file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.getByTestId('import-environment').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(multiEnvFile);

      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();
    });

    await test.step('Verify both environments are available in selector', async () => {
      await page.waitForTimeout(500);

      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();

      await page.waitForTimeout(300);
      await expect(page.locator('.dropdown-item').filter({ hasText: /^local$/ })).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.dropdown-item').filter({ hasText: /^prod$/ })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test switching to prod environment and verify variables', async () => {
      // Test switching to prod environment
      await page.locator('.dropdown-item').filter({ hasText: 'prod' }).click();
      await expect(page.locator('.current-environment')).toContainText('prod');

      // Verify prod environment variables by opening settings again
      await page.getByTestId('environment-selector-trigger').hover();
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByText('Configure', { exact: true }).click();

      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(envTab).toBeVisible();

      // Verify prod environment variables
      await expect(page.getByRole('row', { name: 'host' }).getByRole('cell').nth(1)).toBeVisible();
      await expect(page.getByRole('row', { name: 'secretToken' }).getByRole('cell').nth(1)).toBeVisible();

      await envTab.hover();
      await envTab.getByTestId('request-tab-close-icon').click();
    });

    await test.step('Clean up after test', async () => {
      // Clean up any existing environments folder before test
      if (fs.existsSync(environmentsPath)) {
        fs.rmSync(environmentsPath, { recursive: true, force: true });
      }
    });
  });
});
