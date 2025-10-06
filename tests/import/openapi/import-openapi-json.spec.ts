import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import OpenAPI v3 JSON Collection', () => {
  test('Import simple OpenAPI v3 JSON successfully', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-simple.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // verify that the import modal switches to settings view
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');

    // verify the settings content is visible
    await expect(importModal.getByText('Folder arrangement')).toBeVisible();

    // click the Import button in the modal footer
    await importModal.getByRole('button', { name: 'Import' }).click();

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('Simple Test API')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
