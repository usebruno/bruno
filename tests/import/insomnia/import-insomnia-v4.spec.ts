import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, expandFolder, importCollection, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

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
    const { plusMenu, import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const collectionName = 'Test API Collection v4';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('insomnia-v4-json');

    await test.step('Open the plus menu and choose import collection', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
    });

    await test.step('Verify that import dialog shows File', async () => {
      await expect(importLocators.fileTab()).toContainText('File');
    });

    await test.step('Choose the Insomnia JSON file', async () => {
      await expect(importLocators.chooseFilesButton()).toBeVisible();
      await importLocators.fileInput().setInputFiles(insomniaFile);
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal.getByText(collectionName)).toBeVisible();
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
      await expect(sidebar.itemsIn(collectionName, 'Login User')).toBeVisible();

      await sidebar.itemsIn(collectionName, 'Get Users').click();
      await expect(tabs.activeRequestTab()).toContainText('Get Users');
      await expect(request.methodDropdown()).toContainText('GET');
      await expect(request.urlLine()).toContainText('{{baseUrl}}/api/users');
    });
  });
});
