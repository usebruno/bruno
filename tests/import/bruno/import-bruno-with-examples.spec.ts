import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('Import Bruno Collection with Examples', () => {
  test.beforeAll(async ({ page }) => {
    // Navigate back to homescreen after all tests
    await page.locator('.bruno-logo').click();
  });

  test('Import Bruno collection with examples successfully', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-with-examples.json');

    await test.step('Open import collection modal', async () => {
      await page.getByRole('button', { name: 'Import Collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload collection file', async () => {
      await page.setInputFiles('input[type="file"]', brunoFile);
    });

    await test.step('Wait for file processing to complete', async () => {
      await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });
    });

    await test.step('Verify no parsing errors occurred', async () => {
      const hasError = await page.getByText('Failed to parse the file').isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Collection import failed with parsing error');
      }
    });

    await test.step('Verify location selection modal appears', async () => {
      const locationModal = page.getByRole('dialog');
      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Verify collection name appears in location modal', async () => {
      const locationModal = page.getByRole('dialog');
      await expect(locationModal.getByText('bruno-with-examples')).toBeVisible();
    });

    await test.step('Cleanup - close modal', async () => {
      await page.locator('[data-test-id="modal-close-button"]').click();
    });
  });
});
