import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('Multiple Files Upload', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Multiple files can be uploaded together', async ({ page, createTmpDir }) => {
    const postmanFile = path.join(testDataDir, 'sample-postman.json');
    const insomniaFile = path.join(testDataDir, 'sample-insomnia.json');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', [postmanFile, insomniaFile]);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Bulk Import modal is now displayed
    const bulkImportModal = page.getByRole('dialog');
    await expect(bulkImportModal.locator('.bruno-modal-header-title')).toContainText('Bulk Import');

    // Check that the Collections count shows 2 collections in the Bulk Import modal
    await expect(bulkImportModal.getByText('Collections (2)')).toBeVisible();

    // Verify collection names are displayed
    await expect(bulkImportModal.getByText('Sample Postman Collection')).toBeVisible();
    await expect(bulkImportModal.getByText('Sample Insomnia Collection')).toBeVisible();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('multiple-files-test'));
    await bulkImportModal.getByRole('button', { name: 'Import' }).click();

    // Wait for import to complete (summary modal shows with "Close" button)
    await expect(bulkImportModal.getByRole('button', { name: 'Close' })).toBeVisible();

    // Close the summary modal
    await bulkImportModal.getByRole('button', { name: 'Close' }).click();
    await bulkImportModal.waitFor({ state: 'hidden' });

    // Verify collections were imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Sample Postman Collection')).toBeVisible();
    await expect(page.locator('#sidebar-collection-name').getByText('Sample Insomnia Collection')).toBeVisible();
  });
});
