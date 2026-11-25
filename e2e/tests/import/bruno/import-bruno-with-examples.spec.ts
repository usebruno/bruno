import { test, expect } from '../../../playwright';
import * as path from 'path';
import { buildCommonLocators, closeAllCollections, importCollection, openCollection } from '../../../pages';
import { buildImportPageLocators } from '../../../pages/open-collection-modal/import-page';
import { showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';

test.describe('Import Bruno Collection with Examples', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno collection with examples successfully', async ({ page, createTmpDir }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-with-examples.json');
    const collectionName = 'bruno-with-examples';
    const { sidebar } = buildCommonLocators(page);

    await test.step('Import the collection', async () => {
      await importCollection(page, brunoFile, await createTmpDir('bruno-with-examples'), {
        expectedCollectionName: collectionName
      });
    });

    await test.step('Verify the request keeps its example', async () => {
      await expect(sidebar.itemRowIn(collectionName, 'echo-request')).toBeVisible();
      await sidebar.requestExamplesToggleIn(collectionName, 'echo-request').click();
      await expect(sidebar.exampleIn(collectionName, 'example')).toBeVisible();
    });
  });

  test('TC-105: Imports a valid Bruno collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const brunoFile = path.join(__dirname, 'fixtures', 'bruno-with-examples.json');
    const { import: importLocators, request, sidebar, tabs } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);
    const collectionName = 'bruno-with-examples';
    const requestName = 'echo-request';
    const locationModal = importLocators.locationModal();
    const collectionTempDir = await createTmpDir('bruno-with-examples');

    await test.step('Open the Import page of the Open collection modal', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    await test.step('Verify that the Import page offers to select files', async () => {
      await expect(importPage.selectFilesLink()).toBeVisible();
    });

    await test.step('Choose the Bruno collection file', async () => {
      await importPage.fileInput().setInputFiles(brunoFile);
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal).toContainText(collectionName);
    });

    await test.step('Import the collection', async () => {
      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await sidebar.collection(collectionName).waitFor({ state: 'visible' });
    });

    await test.step('Verify that the imported collection keeps its request', async () => {
      await openCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, requestName)).toBeVisible();
      await expect(sidebar.collectionItemNames(collectionName)).toHaveCount(1);

      await sidebar.itemsIn(collectionName, requestName).click();
      await expect(tabs.activeRequestTab()).toContainText(requestName);
      await expect(request.methodDropdown()).toContainText('POST');
      await expect(request.urlLine()).toContainText('https://testbench-sanity.usebruno.com/api/echo/json');
    });
  });
});
