import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Insomnia Collection - Missing Collection Array', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Handle Insomnia v5 collection missing collection array', async ({ page }) => {
    const insomniaFile = path.join(testDataDir, 'insomnia-v5-invalid-missing-collection.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', insomniaFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Check for error message
    const hasError = await page.getByText('Import collection failed').first().isVisible();
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
