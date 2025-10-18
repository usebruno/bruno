import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import OpenAPI v3 YAML Collection', () => {
  test('Import comprehensive OpenAPI v3 YAML successfully', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-comprehensive.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // verify that the import settings modal appears
    const settingsModal = page.getByTestId('import-settings-modal');
    await expect(settingsModal.locator('.bruno-modal-header-title')).toContainText('OpenAPI Import Settings');

    // click the Import button in the settings modal footer
    await settingsModal.getByRole('button', { name: 'Import' }).click();

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('Comprehensive API Test Collection')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
