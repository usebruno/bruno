import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid Postman Collection - Invalid JSON', () => {
  test('Handle invalid JSON syntax', async ({ page }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-invalid-schema.json');

    await page.getByRole('button', { name: 'Import Collection' }).click();
    
    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    
    await page.setInputFiles('input[type="file"]', postmanFile);
    
    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Check for error message
    const hasError = await page.getByText('Conversion failed').first().isVisible();
    expect(hasError).toBe(true);
    
    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
