import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Bruno Collection - Missing Required Schema Fields', () => {
  test('Import Bruno collection missing required version field should fail', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-missing-required-fields.json');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', brunoFile);

    // Check for schema validation error messages
    const hasImportError = await page.getByText('Unsupported collection format').first().isVisible({ timeout: 5000 });

    expect(hasImportError).toBe(true);

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
