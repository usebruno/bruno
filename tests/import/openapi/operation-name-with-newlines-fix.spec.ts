import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('OpenAPI Newline Handling', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should handle operation names with newlines', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-newline-in-operation-name.yaml');

    // start the import process
    await page.getByRole('button', { name: 'Import Collection' }).click();

    // wait for the import collection modal to appear
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // upload the OpenAPI file with problematic operation names
    await page.setInputFiles('input[type="file"]', openApiFile);

    // verify that the collection location modal appears (OpenAPI files go directly to location modal)
    const locationModal = page.getByTestId('import-collection-location-modal');
    await expect(locationModal.getByText('Newline Test Collection')).toBeVisible();

    // select a location
    await page.locator('#collection-location').fill(await createTmpDir('newline-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // verify the collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Newline Test Collection')).toBeVisible();

    // configure the collection settings
    await page.locator('#sidebar-collection-name').getByText('Newline Test Collection').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // verify that all requests were imported correctly despite newlines in operation names
    // the parser should clean up the operation names and create valid request names
    await expect(page.locator('#collection-newline-test-collection .collection-item-name')).toHaveCount(2);
  });
});
