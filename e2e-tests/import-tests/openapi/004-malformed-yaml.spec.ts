import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid OpenAPI - Malformed YAML', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Handle malformed OpenAPI YAML structure', async ({ page }) => {
    const openApiFile = path.join(testDataDir, 'openapi-malformed.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Check for error message - this should fail during YAML parsing
    const hasParseError = await page.getByText('Failed to parse the file').isVisible();
    const hasImportError = await page.getByText('Import collection failed').isVisible();

    // Either parsing error or import error should be shown
    expect(hasParseError || hasImportError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
