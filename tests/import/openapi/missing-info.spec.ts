import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid OpenAPI - Missing Info Section', () => {
  test('Handle OpenAPI specification missing required info section', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-missing-info.yaml');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    const errorMessage = page.getByText('Unsupported collection format').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
