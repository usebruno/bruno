import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Bruno Testbench Collection', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Import Bruno Testbench collection successfully', async ({ page }) => {
    const brunoFile = path.join(testDataDir, 'bruno-testbench.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', brunoFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('bruno-testbench')).toBeVisible();

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
