import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('OpenAPI Duplicate Names Handling', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should handle duplicate operation names', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-duplicate-operation-name.yaml');

    // start the import process
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // wait for the import collection modal to appear
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // upload the OpenAPI file with duplicate operation names
    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for location modal to appear after file processing
    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });

    // wait for the file processing to complete

    // select a location
    await page.locator('#collection-location').fill(await createTmpDir('duplicate-test'));
    await locationModal.getByRole('button', { name: 'Import' }).click();
    await locationModal.waitFor({ state: 'hidden' });

    // verify the collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Duplicate Test Collection')).toBeVisible();

    // configure the collection settings
    await page.locator('#sidebar-collection-name').getByText('Duplicate Test Collection').click();

    // verify that all 3 requests were imported correctly despite duplicate operation names
    await expect(page.locator('#collection-duplicate-test-collection .collection-item-name')).toHaveCount(3);
  });
});
