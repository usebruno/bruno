import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Invalid OpenAPI - Missing Info Section', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('Handle OpenAPI specification missing required info section', async ({ page }) => {
    const openApiFile = path.join(testDataDir, 'openapi-missing-info.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // The OpenAPI parser might handle missing info gracefully with defaults
    const hasError = await page.getByText('Import collection failed').first().isVisible();

    // Either should show an error or create an "Untitled Collection"
    expect(hasError).toBe(true);

    // Cleanup: close any open modals
    await page.locator('[data-test-id="modal-close-button"]').click();
  });
});
