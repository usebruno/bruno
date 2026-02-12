import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';

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
});
