import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Insomnia Collection - Malformed Structure', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Handle malformed Insomnia collection structure', async ({ page }) => {
    const insomniaFile = path.join(testDataDir, 'insomnia-malformed.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', insomniaFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Check for error message - this should fail during JSON parsing
    const hasError = await page.getByText('Failed to parse the file').isVisible();
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
