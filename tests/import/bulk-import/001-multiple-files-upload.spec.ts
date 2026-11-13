import { test, expect } from '../../../playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { closeAllCollections, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

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
    const collectionsHeading = bulkImportModal.getByTestId('selection-heading').filter({ hasText: 'Collections' });
    await expect(collectionsHeading).toBeVisible();
    await expect(collectionsHeading.getByTestId('selection-count')).toHaveText('2');

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

    const { plusMenu, import: importLocators, request, sidebar, tabs, modal } = buildCommonLocators(page);
    const bulkModal = importLocators.bulkModal();
    const collectionTempDir = await createTmpDir('multiple-postman-import');

    await test.step('Open the plus menu and choose import collection', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
    });

    await test.step('Verify that import dialog shows File', async () => {
      await expect(importLocators.fileTab()).toContainText('File');
    });

    await test.step('Choose multiple Postman JSON files', async () => {
      await expect(importLocators.chooseFilesButton()).toBeVisible();
      await importLocators.fileInput().setInputFiles(importFiles);
      await bulkModal.waitFor({ state: 'visible' });
      await expect(bulkModal.getByText(collectionNames[0])).toBeVisible();
      await expect(bulkModal.getByText(collectionNames[1])).toBeVisible();
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
