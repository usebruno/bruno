import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid File Handling', () => {
  test('Handle invalid file without crashing', async ({ page }) => {
    const invalidFile = path.resolve(__dirname, '../common/fixtures', 'invalid.txt');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', invalidFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const hasError = await page.getByText("Failed to parse the file – ensure it is valid JSON or YAML").first().isVisible();
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
