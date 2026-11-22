import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, openBulkImportModal } from '../../../pages';

test.describe('Multiple Files Upload', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Multiple files can be uploaded together', async ({ page, createTmpDir }) => {
    const { import: importLocators, modal, sidebar } = buildCommonLocators(page);
    const bulkImportModal = importLocators.bulkModal();
    const postmanFile = path.join(testDataDir, 'sample-postman.json');
    const insomniaFile = path.join(testDataDir, 'sample-insomnia.json');

    await test.step('Select both files and verify the Bulk Import modal lists both collections', async () => {
      await openBulkImportModal(page, [postmanFile, insomniaFile]);

      await expect(modal.title('Bulk Import')).toBeVisible();
      await expect(importLocators.bulkCollectionsCount()).toHaveText('2');
      await expect(importLocators.bulkCollectionTitle('Sample Postman Collection')).toBeVisible();
      await expect(importLocators.bulkCollectionTitle('Sample Insomnia Collection')).toBeVisible();
    });

    await test.step('Select a location and import', async () => {
      await importLocators.bulkLocationInput().fill(await createTmpDir('multiple-files-test'));
      await importLocators.bulkSubmitButton().click();

      await expect(importLocators.bulkSubmitButton()).toHaveText('Close');
    });

    await test.step('Close the summary modal', async () => {
      await importLocators.bulkSubmitButton().click();

      await expect(bulkImportModal).toBeHidden();
    });

    await test.step('Verify collections were imported successfully', async () => {
      await expect(sidebar.collection('Sample Postman Collection')).toBeVisible();
      await expect(sidebar.collection('Sample Insomnia Collection')).toBeVisible();
    });
  });
});
