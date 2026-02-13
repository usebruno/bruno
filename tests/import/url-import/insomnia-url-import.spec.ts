import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';

test.describe('Insomnia URL Import', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Insomnia URL import', async ({ page, createTmpDir }) => {
    const insomniaUrl = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/insomnia/fixtures/insomnia-v5.yaml';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    await page.getByTestId('url-tab').click();
    await page.getByTestId('url-input').waitFor({ state: 'visible' });
    await page.getByTestId('url-input').fill(insomniaUrl);
    await page.locator('#import-url-button').click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the collection location modal appears
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Test API Collection v5')).toBeVisible();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('test-api-collection-v5'));
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Verify the collection was imported successfully and configure it
    await expect(page.locator('#sidebar-collection-name').getByText('Test API Collection v5')).toBeVisible();
    await openCollection(page, 'Test API Collection v5');

    // Verify these folder names are present
    await expect(page.locator('.collection-item-name').getByText('API Tests')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('Data Management')).toBeVisible();
  });
});
