import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Corrupted Bruno Collection - Should Fail', () => {
  test('Import Bruno collection with invalid JSON structure should fail', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-malformed.json');

    // go to welcome screen
    await page.locator('.bruno-logo').click();

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', brunoFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Check for JSON parsing error
    const hasImportError = await page.getByText('Failed to parse the file – ensure it is valid JSON or YAML').first().isVisible();

    // Either parsing error or import error should be shown
    expect(hasImportError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
