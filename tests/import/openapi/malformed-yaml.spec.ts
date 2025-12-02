import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid OpenAPI - Malformed YAML', () => {
  test('Handle malformed OpenAPI YAML structure', async ({ page }) => {
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-malformed.yaml');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Check for error message - this should fail during YAML parsing
    const hasParseError = await page.getByText('Failed to parse the file').isVisible();
    const hasImportError = await page.getByText('Import collection failed').isVisible();

    // Either parsing error or import error should be shown
    expect(hasParseError || hasImportError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
