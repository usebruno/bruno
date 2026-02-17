import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Postman Collection - Invalid Schema', () => {
  test('Handle Postman collection with invalid schema version', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-invalid-schema.json');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', postmanFile);

    // Check for error message
    await expect(page.getByText('Unsupported collection format').first()).toBeVisible();

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
