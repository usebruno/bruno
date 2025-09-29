import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('OpenAPI Duplicate Names Handling', () => {
  test('should handle duplicate operation names', async ({ page, createTmpDir }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-duplicate-operation-name.yaml');

    // start the import process
    await page.getByRole('button', { name: 'Import Collection' }).click();

    // wait for the import collection modal to appear
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // upload the OpenAPI file with duplicate operation names
    await page.setInputFiles('input[type="file"]', openApiFile);

    // wait for the file processing to complete
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // verify that the collection location modal appears (OpenAPI files go directly to location modal)
    const locationModal = page.getByTestId('import-collection-location-modal');
    // verify the collection name is correctly parsed despite duplicate operation names
    await expect(locationModal.getByText('Duplicate Test Collection')).toBeVisible();

    // select a location
    await page.locator('#collection-location').fill(await createTmpDir('duplicate-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    // verify the collection was imported successfully
    await expect(page.locator('#sidebar-collection-name').getByText('Duplicate Test Collection')).toBeVisible();

    // configure the collection settings
    await page.locator('#sidebar-collection-name').getByText('Duplicate Test Collection').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // verify that all 3 requests were imported correctly despite duplicate operation names
    await expect(page.locator('#collection-duplicate-test-collection .collection-item-name')).toHaveCount(3);

    // cleanup: close the collection
    await page
      .locator('.collection-name')
      .filter({ has: page.locator('#sidebar-collection-name:has-text("Duplicate Test Collection")') })
      .locator('.collection-actions')
      .click();
    await page.locator('.dropdown-item').getByText('Close').click();
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
