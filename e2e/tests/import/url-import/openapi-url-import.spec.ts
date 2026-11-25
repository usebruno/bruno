import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  expandCollection,
  expandFolderIn,
  openCollection
} from '../../../pages';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from '../../../pages/open-collection-modal/shell';
import { buildImportPageLocators, loadImportText } from '../../../pages/open-collection-modal/import-page';

test.describe('OpenAPI URL Import', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Swagger/OpenAPI URL import', async ({ page, createTmpDir }) => {
    const openapiUrl = 'https://petstore.swagger.io/v2/swagger.json';
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const locationModal = importLocators.locationModal();

    await test.step('Load the Swagger Petstore URL on the Import page', async () => {
      await loadImportText(page, openapiUrl);
    });

    await test.step('Verify the location modal offers the OpenAPI settings', async () => {
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal).toContainText('Swagger Petstore');
      await expect(importLocators.folderArrangementLabel()).toBeVisible();
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });

    await test.step('Import with the default grouping (tags)', async () => {
      await importLocators.locationInput().fill(await createTmpDir('swagger-petstore'));
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify the collection has a folder per tag', async () => {
      await expect(sidebar.collection('Swagger Petstore')).toBeVisible();
      await openCollection(page, 'Swagger Petstore');
      for (const folder of ['pet', 'store', 'user']) {
        await expect(sidebar.itemsIn('Swagger Petstore', folder)).toBeVisible();
      }
    });
  });

  test('Swagger/OpenAPI URL import with path-based grouping', async ({ page, createTmpDir }) => {
    const openapiUrl = 'https://petstore.swagger.io/v2/swagger.json';
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const locationModal = importLocators.locationModal();

    await test.step('Load the Swagger Petstore URL on the Import page', async () => {
      await loadImportText(page, openapiUrl);
    });

    await test.step('Verify the location modal offers the OpenAPI settings', async () => {
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal).toContainText('Swagger Petstore');
      await expect(importLocators.folderArrangementLabel()).toBeVisible();
    });

    await test.step('Import with path-based grouping', async () => {
      await importLocators.groupingDropdown().click();
      await importLocators.groupingOption('path').click();
      await importLocators.locationInput().fill(await createTmpDir('swagger-petstore-path'));
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
    });

    await test.step('Verify the collection has a folder per path, with nested path folders', async () => {
      await expect(sidebar.collection('Swagger Petstore')).toBeVisible();
      await openCollection(page, 'Swagger Petstore');
      for (const folder of ['pet', 'store', 'user']) {
        await expect(sidebar.itemsIn('Swagger Petstore', folder)).toBeVisible();
      }

      await expandFolderIn(page, 'Swagger Petstore', 'pet');
      await expect(sidebar.itemsIn('Swagger Petstore', '{petId}')).toBeVisible();
    });
  });

  test('TC-115: Imports an OpenAPI v3 collection from a URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const openApiUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
    const collectionName = 'Swagger Petstore - OpenAPI 3.0';
    const collectionTempDir = await createTmpDir('openapi-v3-url-import');
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importPage = buildImportPageLocators(page);
    const locationModal = importLocators.locationModal();

    await test.step('Open the Import page and verify it offers the URL field', async () => {
      await showOpenCollectionModal(page, 'import');
      await expect(openCollectionModal.pageTitle()).toHaveText('Import');
      await expect(importPage.textInput()).toBeVisible();
    });

    await test.step('Enter the OpenAPI v3 URL and verify the field offers Enter to import', async () => {
      await importPage.textInput().fill(openApiUrl);
      await expect(importPage.enterHint()).toHaveText('Enter to import');
    });

    await test.step('Press Enter and import', async () => {
      await importPage.textInput().press('Enter');
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal).toContainText(collectionName);

      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Verify that Imported collection keeps its folder and requests', async () => {
      await expandCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'pet')).toBeVisible();

      await expandFolderIn(page, collectionName, 'pet');
      await expect(sidebar.itemsIn(collectionName, 'Finds Pets by status')).toBeVisible();
    });
  });
});
