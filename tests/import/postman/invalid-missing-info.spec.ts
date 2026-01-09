import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Postman Collection - Missing Info', () => {
  test('Handle Postman collection missing required info field', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-invalid-missing-info.json');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', postmanFile);

    // Check for error message
    const hasError = await page.getByText('Unsupported collection format').first().isVisible();
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
