import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('All Collection Types Bulk Import', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('All 4 collection types appear in bulk import', async ({ page, createTmpDir }) => {
    const postmanFile = path.join(testDataDir, 'sample-postman.json');
    const insomniaFile = path.join(testDataDir, 'sample-insomnia.json');
    const brunoFile = path.join(testDataDir, 'sample-bruno.json');
    const openapiFile = path.join(testDataDir, 'sample-openapi.yaml');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', [postmanFile, insomniaFile, brunoFile, openapiFile]);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Bulk Import modal is displayed (no separate settings modal anymore)
    const bulkImportModal = page.getByRole('dialog');
    await expect(bulkImportModal.locator('.bruno-modal-header-title')).toContainText('Bulk Import');

    // Check that the Collections count shows 4 collections in the Bulk Import modal
    await expect(bulkImportModal.getByText('Collections (4)')).toBeVisible();
    await expect(bulkImportModal.getByText('Sample Postman Collection')).toBeVisible();
    await expect(bulkImportModal.getByText('Sample Insomnia Collection')).toBeVisible();
    await expect(bulkImportModal.getByText('Sample Bruno Collection')).toBeVisible();
    await expect(bulkImportModal.getByText('Sample API')).toBeVisible();

    // Verify that OpenAPI settings are visible (since one file is OpenAPI)
    await expect(bulkImportModal.getByText('Folder arrangement')).toBeVisible();
    await expect(bulkImportModal.getByTestId('grouping-dropdown')).toBeVisible();

    // Optionally change grouping to path-based
    await bulkImportModal.getByTestId('grouping-dropdown').click();
    await bulkImportModal.getByTestId('grouping-option-path').click();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('all-collection-types-test'));
    await bulkImportModal.getByRole('button', { name: 'Import' }).click();

    // Wait for import to complete (summary modal shows with "Close" button)
    await expect(bulkImportModal.getByRole('button', { name: 'Close' })).toBeVisible();

    // Close the summary modal
    await bulkImportModal.getByRole('button', { name: 'Close' }).click();
    await bulkImportModal.waitFor({ state: 'hidden' });

    // Verify all collections were imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Sample Postman Collection')).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').getByText('Sample Insomnia Collection')).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').getByText('Sample Bruno Collection')).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').getByText('Sample API')).toBeVisible();
  });
});
