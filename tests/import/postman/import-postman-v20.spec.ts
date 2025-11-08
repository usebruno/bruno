import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Postman Collection v2.0', () => {
  test('Import Postman Collection v2.0 successfully', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-v20.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', postmanFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('Postman v2.0 Collection')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
