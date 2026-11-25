import { test, expect } from '../../../playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, openBulkImportModal, openCollection } from '../../../pages';
import { buildImportPageLocators } from '../../../pages/open-collection-modal/import-page';
import { showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';

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

  test('TC-109: Imports multiple Postman collections from JSON files', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const sourceFile = path.join(testDataDir, 'sample-postman.json');
    const sourceContent = JSON.parse(await fs.readFile(sourceFile, 'utf-8'));
    const filesDir = await createTmpDir('postman-json-files');
    const collectionNames = ['Postman Collection One', 'Postman Collection Two'];
    const importFiles: string[] = [];

    for (const [index, name] of collectionNames.entries()) {
      const filePath = path.join(filesDir, `postman-${index + 1}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        ...sourceContent,
        info: { ...sourceContent.info, name }
      }));
      importFiles.push(filePath);
    }

    const { import: importLocators, request, sidebar, tabs, modal } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);
    const bulkModal = importLocators.bulkModal();
    const collectionTempDir = await createTmpDir('multiple-postman-import');

    await test.step('Open the Import page of the Open collection modal', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify that the Import page offers to select files', async () => {
      await expect(importPage.selectFilesLink()).toBeVisible();
    });

    await test.step('Choose multiple Postman JSON files', async () => {
      await importPage.fileInput().setInputFiles(importFiles);
      await bulkModal.waitFor({ state: 'visible' });
      await expect(importLocators.bulkCollectionName(collectionNames[0])).toBeVisible();
      await expect(importLocators.bulkCollectionName(collectionNames[1])).toBeVisible();
    });

    await test.step('Import the collections', async () => {
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.bulkSubmitButton().click();
      await modal.button('Close').waitFor({ state: 'visible' });
      await modal.button('Close').click();
      await bulkModal.waitFor({ state: 'hidden' });
      await sidebar.collection(collectionNames[0]).waitFor({ state: 'visible' });
      await sidebar.collection(collectionNames[1]).waitFor({ state: 'visible' });
    });

    await test.step('Verify that the imported collections keep their requests', async () => {
      for (const name of collectionNames) {
        await openCollection(page, name);
        await expect(sidebar.itemsIn(name, 'Get Users')).toBeVisible();
        await expect(sidebar.itemsIn(name, 'Create User')).toBeVisible();

        await sidebar.itemsIn(name, 'Get Users').click();
        await expect(tabs.activeRequestTab()).toContainText('Get Users');
        await expect(request.methodDropdown()).toContainText('GET');
        await expect(request.urlLine()).toContainText('https://jsonplaceholder.typicode.com/users');
      }
    });
  });
});
