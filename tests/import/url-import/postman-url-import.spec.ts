import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';

test.describe('Postman URL Import', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Postman URL import', async ({ page, createTmpDir }) => {
    const postmanUrl = 'https://raw.githubusercontent.com/usebruno/bruno/refs/heads/main/tests/import/postman/fixtures/postman-v21.json';

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    await page.getByTestId('url-tab').click();
    await page.getByTestId('url-input').waitFor({ state: 'visible' });
    await page.getByTestId('url-input').fill(postmanUrl);
    await page.locator('#import-url-button').click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the collection location modal appears
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Postman v2.1 Collection')).toBeVisible();

    // Select a location and import
    await page.locator('#collection-location').fill(await createTmpDir('postman-v21-collection'));
    await locationModal.getByRole('button', { name: 'Import' }).click();
    await locationModal.waitFor({ state: 'hidden' });

    // Verify the collection was imported successfully and configure it
    await expect(page.locator('#sidebar-collection-name').getByText('Postman v2.1 Collection')).toBeVisible();
    await openCollection(page, 'Postman v2.1 Collection');

    // Verify these folder names are present
    await expect(page.locator('.collection-item-name').getByText('Get Users')).toBeVisible();
    await expect(page.locator('.collection-item-name').getByText('Create User')).toBeVisible();
  });
});
