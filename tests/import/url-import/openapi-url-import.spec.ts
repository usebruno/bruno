import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, expandCollection, expandFolder, openCollection } from '../../utils/page';

test.describe('OpenAPI URL Import', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Swagger/OpenAPI URL import', async ({ page, createTmpDir }) => {
    const openapiUrl = 'https://petstore.swagger.io/v2/swagger.json';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    await page.getByTestId('url-tab').click();
    await page.getByTestId('url-input').waitFor({ state: 'visible' });
    await page.getByTestId('url-input').fill(openapiUrl);
    await page.locator('#import-url-button').click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the collection location modal appears with OpenAPI settings
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Swagger Petstore')).toBeVisible();

    // Verify OpenAPI settings are available in the location modal
    await expect(locationModal.getByText('Folder arrangement')).toBeVisible();
    await expect(locationModal.getByTestId('grouping-dropdown')).toBeVisible();

    // Select a location and import with default grouping (tags)
    await page.locator('#collection-location').fill(await createTmpDir('swagger-petstore'));
    await locationModal.getByRole('button', { name: 'Import' }).click();
    await locationModal.waitFor({ state: 'hidden' });

    // Verify the collection was imported successfully and configure it
    await expect(page.locator('#sidebar-collection-name').getByText('Swagger Petstore')).toBeVisible();
    await openCollection(page, 'Swagger Petstore');

    // Verify these folder names are present (tag-based grouping)
    await expect(page.locator('.collection-item-name').getByText('pet')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('store')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('user')).toBeVisible();
  });

  test('Swagger/OpenAPI URL import with path-based grouping', async ({ page, createTmpDir }) => {
    const openapiUrl = 'https://petstore.swagger.io/v2/swagger.json';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    await page.getByTestId('url-tab').click();
    await page.getByTestId('url-input').waitFor({ state: 'visible' });
    await page.getByTestId('url-input').fill(openapiUrl);
    await page.locator('#import-url-button').click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the collection location modal appears with OpenAPI settings
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Swagger Petstore')).toBeVisible();

    // Verify OpenAPI settings are available in the location modal
    await expect(locationModal.getByText('Folder arrangement')).toBeVisible();

    // Select path-based grouping from the dropdown
    await locationModal.getByTestId('grouping-dropdown').click();

    // Wait for dropdown options to be visible and select path-based grouping
    await page.getByTestId('grouping-option-path').waitFor({ state: 'visible' });
    await page.getByTestId('grouping-option-path').click();

    // Select a location and import with path-based grouping
    await page.locator('#collection-location').fill(await createTmpDir('swagger-petstore-path'));
    await locationModal.getByRole('button', { name: 'Import' }).click();
    await locationModal.waitFor({ state: 'hidden' });

    // Verify the collection was imported successfully and configure it
    await expect(page.locator('#sidebar-collection-name').getByText('Swagger Petstore')).toBeVisible();
    await openCollection(page, 'Swagger Petstore');

    // Verify that the collection has been imported with path-based grouping
    // Should have folders based on URL paths like 'pet', 'store', 'user'
    await expect(page.locator('.collection-item-name').getByText('pet')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('store')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('user')).toBeVisible();

    // Expand the pet folder to check for nested path structure
    await page.locator('.collection-item-name').getByText('pet').click();

    // Verify that the pet folder contains path-based subfolders like '{petId}'
    await expect(page.locator('.collection-item-name').getByText('{petId}')).toBeVisible();
  });

  test('TC-115: Imports an OpenAPI v3 collection from a URL', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const openApiUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
    const collectionName = 'Swagger Petstore - OpenAPI 3.0';
    const collectionTempDir = await createTmpDir('openapi-v3-url-import');
    const { plusMenu, import: importLocators, sidebar } = buildCommonLocators(page);
    const locationModal = importLocators.locationModal();

    await test.step('Open the plus menu and verify Import collection is shown', async () => {
      await plusMenu.button().click();
      await plusMenu.importCollection().waitFor({ state: 'visible' });
    });

    await test.step('Choose Import collection and verify that Import dialog shows URL', async () => {
      await plusMenu.importCollection().click();
      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.urlTab()).toContainText('URL');
    });

    await test.step('Choose URL and verify the URL input is shown', async () => {
      await importLocators.urlTab().click();
      await expect(importLocators.urlInput()).toBeVisible();
    });

    await test.step('Enter the OpenAPI v3 URL and import', async () => {
      await importLocators.urlInput().fill(openApiUrl);
      await importLocators.urlImportButton().click();
      await importLocators.loader().waitFor({ state: 'hidden' });
      await locationModal.waitFor({ state: 'visible' });
      await expect(locationModal.getByText(collectionName)).toBeVisible();

      await importLocators.locationInput().fill(collectionTempDir);
      await importLocators.importButton().click();
      await locationModal.waitFor({ state: 'hidden' });
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Verify that Imported collection keeps its folder and requests', async () => {
      await expandCollection(page, collectionName);
      await expect(sidebar.itemsIn(collectionName, 'pet')).toBeVisible();

      await expandFolder(page, 'pet');
      await expect(sidebar.itemsIn(collectionName, 'Finds Pets by status')).toBeVisible();
    });
  });
});
