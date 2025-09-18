import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import OpenAPI v3 JSON Collection', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Import simple OpenAPI v3 JSON successfully', async ({ page, createTmpDir }) => {
    const openApiFile = path.join(testDataDir, 'openapi-simple.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Now we should see the OpenAPI Import Settings modal
    const settingsModal = page.getByRole('dialog').filter({ hasText: 'OpenAPI Import Settings' });
    await settingsModal.waitFor({ state: 'visible' });
    await expect(settingsModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');

    await page.locator('[data-test-id="grouping-dropdown"]').click();
    await page.locator('[data-test-id="grouping-option-path"]').waitFor({ state: 'visible' });
    await page.locator('[data-test-id="grouping-option-path"]').click();

    // Click Import button in settings modal
    await settingsModal.getByRole('button', { name: 'Import' }).click();

    // Wait for the collection location modal to appear
    await page.locator('#collection-location').waitFor({ state: 'visible' });
    await page.locator('#collection-location').fill(await createTmpDir('openapi-simple'));

    // Click the final Import button to actually import the collection
    const collectionLocationModal = page.getByRole('dialog');
    await collectionLocationModal.getByRole('button', { name: 'Import' }).click();

    // Cleanup: close any open modals
    await page.locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.locator('.bruno-logo').click();
  });
});
