import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Corrupted Bruno Collection - Should Fail', () => {
  test('Import Bruno collection with invalid JSON structure should fail', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-malformed.json');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', brunoFile);

    const errorLocator = page.getByText(/Failed to parse the file|Unsupported collection format|Invalid|Error/).first();
    await expect(errorLocator).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
