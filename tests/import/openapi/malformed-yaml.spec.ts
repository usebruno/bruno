import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid OpenAPI - Malformed YAML', () => {
  test('Handle malformed OpenAPI YAML structure', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    const parseError = page.getByText('Failed to parse the file');
    const importError = page.getByText('Import collection failed');

    // Wait for at least one error message to be visible
    await expect(parseError.or(importError)).toBeVisible({ timeout: 10000 });

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
