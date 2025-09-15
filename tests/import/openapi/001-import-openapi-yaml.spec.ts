import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import OpenAPI v3 YAML Collection', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Import comprehensive OpenAPI v3 YAML successfully', async ({ page, createTmpDir }) => {
    const openApiFile = path.join(testDataDir, 'openapi-comprehensive.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await page.locator('[data-test-id="grouping-dropdown"]').click();
    
    // Wait for dropdown to be visible and then click the path option
    await page.locator('[data-test-id="grouping-option-path"]').waitFor({ state: 'visible' });
    await page.locator('[data-test-id="grouping-option-path"]').click();

    // click on import button in the modal
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Wait for the collection location modal to appear
    await page.locator('#collection-location').waitFor({ state: 'visible' });
    await page.locator('#collection-location').fill(await createTmpDir('openapi-comprehensive'));

    // Click the final Import button to actually import the collection
    const collectionLocationModal = page.getByRole('dialog');
    await collectionLocationModal.getByRole('button', { name: 'Import' }).click();

    // Wait for collection to appear in the sidebar
    await expect(page.locator('#sidebar-collection-name')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Comprehensive API Test Collection' });
    await page.locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.locator('.bruno-logo').click();
  });
});
