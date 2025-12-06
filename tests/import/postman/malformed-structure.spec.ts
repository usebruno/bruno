import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Postman Collection - Malformed Structure', () => {
  test('Handle malformed Postman collection structure', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-malformed.json');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', postmanFile);

    const errorLocator = page.getByText(/Unsupported collection format|Failed to parse|Invalid|Error/).first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
