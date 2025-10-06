import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('OpenAPI Path-Based Grouping', () => {
  test('should import with path-based folder grouping', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-path-grouping.json');

    // Start the import process
    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // Upload the OpenAPI file
    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the import settings modal appears after file selection
    const settingsModal = page.getByTestId('import-settings-modal');
    await settingsModal.waitFor({ state: 'visible' });
    await expect(settingsModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');

    // Select path-based grouping from the dropdown
    await settingsModal.getByTestId('grouping-dropdown').click();

    // Wait for dropdown options to be visible (they might be rendered outside the modal)
    await page.getByTestId('grouping-option-path').waitFor({ state: 'visible' });
    await page.getByTestId('grouping-option-path').click();

    // Now import the collection with path-based grouping
    await settingsModal.getByRole('button', { name: 'Import' }).click();

    // Verify that the collection location modal appears
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Path Grouping Test API')).toBeVisible();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('path-grouping-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // Verify the collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Path Grouping Test API')).toBeVisible();

    // Configure the collection settings
    await page.locator('#sidebar-collection-name').getByText('Path Grouping Test API').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify path-based folder structure was created
    // Should have 'users' and 'products' folders
    await expect(page.locator('.collection-item-name').getByText('users')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('products')).toBeVisible();

    // Expand the products folder to check for nested structure
    await page.locator('.collection-item-name').getByText('products').click();

    // Verify that the products folder contains the {id} subfolder
    await expect(page.locator('.collection-item-name').getByText('{id}')).toBeVisible();

    // Cleanup: close the collection
    await page
      .locator('.collection-name')
      .filter({ has: page.locator('#sidebar-collection-name:has-text("Path Grouping Test API")') })
      .locator('.collection-actions')
      .click();
    await page.locator('.dropdown-item').getByText('Close').click();
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
