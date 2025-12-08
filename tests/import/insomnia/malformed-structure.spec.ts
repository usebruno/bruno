import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Insomnia Collection - Malformed Structure', () => {
  test('Handle malformed Insomnia collection structure', async ({ page }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-malformed.json');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', insomniaFile);

    // Check for error message - this should fail during JSON parsing
    const hasError = await page.getByText('Failed to parse the file').first().isVisible();
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
