import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('OpenAPI Path-Based Grouping', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should import with path-based folder grouping', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-path-grouping.json');

    // Start the import process
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // Upload the OpenAPI file
    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for location modal to appear after file processing
    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(locationModal.getByText('Path Grouping Test API')).toBeVisible();

    // Select path-based grouping from dropdown
    await page.getByTestId('grouping-dropdown').click();
    await page.getByTestId('grouping-option-path').click();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('path-grouping-test'));
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Verify the collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Path Grouping Test API')).toBeVisible();

    // Configure the collection settings
    await page.locator('#sidebar-collection-name').getByText('Path Grouping Test API').click();

    // Verify path-based folder structure was created
    // Should have 'users' and 'products' folders
    await expect(page.locator('.collection-item-name').getByText('users')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('products')).toBeVisible();

    // Expand the products folder to check for nested structure
    await page.locator('.collection-item-name').getByText('products').click();

    // Verify that the products folder contains the {id} subfolder
    await expect(page.locator('.collection-item-name').getByText('{id}')).toBeVisible();
  });
});
