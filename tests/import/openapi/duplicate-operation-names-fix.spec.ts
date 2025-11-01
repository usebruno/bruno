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
    await page.getByRole('button', { name: 'Import Collection' }).click();

    // wait for the import collection modal to appear
    const importModal = page.getByTestId('import-collection-modal');
    await importModal.waitFor({ state: 'visible' });

    // upload the OpenAPI file with duplicate operation names
    await page.setInputFiles('input[type="file"]', openApiFile);

    // wait for the file processing to complete
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

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
  });
});
