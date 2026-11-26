import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, expandFolder, importCollection, openCollection } from '../../../pages';
import { buildImportPageLocators } from '../../../pages/open-collection-modal/import-page';
import { showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';

test.describe('Import Insomnia Collection v4', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Insomnia Collection v4 successfully', async ({ page, createTmpDir }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v4.json');

    await importCollection(page, insomniaFile, await createTmpDir('insomnia-v4-test'), {
      expectedCollectionName: 'Test API Collection v4'
    });
  });

  test('TC-110: Imports an Insomnia collection from a JSON file', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const insomniaFile = path.join(__dirname, 'fixtures', 'insomnia-v4.json');
    const { import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);
    const collectionName = 'Test API Collection v4';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('insomnia-v4-json');

    await test.step('Open the Import page of the Open collection modal', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify that the Import page offers to select files', async () => {
      await expect(importPage.selectFilesLink()).toBeVisible();
    });

    await test.step('Choose the Insomnia JSON file', async () => {
      await importPage.fileInput().setInputFiles(insomniaFile);
      await locationModal.waitFor({ state: 'visible' });
      // await expect(locationModal.getByText(collectionName)).toBeVisible();
      await expect(locationModal).toContainText(collectionName);
    });

    await test.step('Import the collection', async () => {
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await sidebar.collection(collectionName).waitFor({ state: 'visible' });
    });

    await test.step('Verify that the imported collection keeps its requests', async () => {
      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'Get Users')).toBeVisible();
      await expect(sidebar.itemsIn(collectionName, 'Authentication')).toBeVisible();

      await expandFolder(page, 'Authentication');
      // FIXME(aparna-bruno): There's a bug here with the insomnia import that needs the `first` call to get the first row item instead of the test failing with duplicate items
      // await expect(sidebar.itemsIn(collectionName, 'Login User').first()).toBeVisible();
      await expect(sidebar.folderRequest('Authentication', 'Login User').first()).toBeVisible();

      await sidebar.itemsIn(collectionName, 'Get Users').click();
      await expect(tabs.activeRequestTab()).toContainText('Get Users');
      await expect(request.methodDropdown()).toContainText('GET');
      await expect(request.urlLine()).toContainText('{{baseUrl}}/api/users');
    });
  });
});
