import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Insomnia Collection - Missing Collection Array', () => {
  test('Handle Insomnia v5 collection missing collection array', async ({ page }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5-invalid-missing-collection.yaml');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', insomniaFile);

    const errorLocator = page.getByText(/Unsupported collection format|Failed to parse|Invalid|Error/).first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
