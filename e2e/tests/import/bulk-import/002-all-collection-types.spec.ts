import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, openBulkImportModal } from '../../../pages';

test.describe('All Collection Types Bulk Import', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('All 4 collection types appear in bulk import', async ({ page, createTmpDir }) => {
    const { import: importLocators, modal, sidebar } = buildCommonLocators(page);
    const bulkImportModal = importLocators.bulkModal();
    const postmanFile = path.join(testDataDir, 'sample-postman.json');
    const insomniaFile = path.join(testDataDir, 'sample-insomnia.json');
    const brunoFile = path.join(testDataDir, 'sample-bruno.json');
    const openapiFile = path.join(testDataDir, 'sample-openapi.yaml');

    await test.step('Select all four files and verify the Bulk Import modal lists every collection', async () => {
      await openBulkImportModal(page, [postmanFile, insomniaFile, brunoFile, openapiFile]);

      await expect(modal.title('Bulk Import')).toBeVisible();
      await expect(importLocators.bulkCollectionsCount()).toHaveText('4');
      await expect(importLocators.bulkCollectionTitle('Sample Postman Collection')).toBeVisible();
      await expect(importLocators.bulkCollectionTitle('Sample Insomnia Collection')).toBeVisible();
      await expect(importLocators.bulkCollectionTitle('Sample Bruno Collection')).toBeVisible();
      await expect(importLocators.bulkCollectionTitle('Sample API')).toBeVisible();
    });

    await test.step('Open the OpenAPI Import configuration and change the Folder arrangement to paths', async () => {
      await importLocators.bulkOpenApiConfigurationToggle().click();

      await expect(importLocators.bulkFolderArrangementLabel()).toBeVisible();
      await expect(importLocators.bulkGroupingDropdown()).toBeVisible();

      await importLocators.bulkGroupingDropdown().click();
      await importLocators.bulkGroupingOption('path').click();
    });

    await test.step('Select a location and import', async () => {
      await importLocators.bulkLocationInput().fill(await createTmpDir('all-collection-types-test'));
      await importLocators.bulkSubmitButton().click();

      await expect(importLocators.bulkSubmitButton()).toHaveText('Close');
    });

    await test.step('Close the summary modal', async () => {
      await importLocators.bulkSubmitButton().click();

      await expect(bulkImportModal).toBeHidden();
    });

    await test.step('Verify all collections were imported successfully', async () => {
      await expect(sidebar.collection('Sample Postman Collection')).toBeVisible();
      await expect(sidebar.collection('Sample Insomnia Collection')).toBeVisible();
      await expect(sidebar.collection('Sample Bruno Collection')).toBeVisible();
      await expect(sidebar.collection('Sample API')).toBeVisible();
    });
  });
});
