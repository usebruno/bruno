import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('Import Bruno Collection with Examples', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno collection with examples successfully', async ({ page }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-with-examples.json');

    await test.step('Open import collection modal', async () => {
      await page.locator('.plus-icon-button').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();
    });

    await test.step('Wait for import modal and verify title', async () => {
      const importModal = page.getByRole('dialog');
      await importModal.waitFor({ state: 'visible' });
      await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Upload collection file and verify location modal appears', async () => {
      await page.setInputFiles('input[type="file"]', brunoFile);

      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      const errorMessage = page.getByText('Failed to parse the file');

      const result = await Promise.race([
        locationModal.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'success'),
        errorMessage.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error')
      ]).catch(() => 'timeout');

      if (result === 'error') {
        throw new Error('Collection import failed with parsing error');
      }
      if (result === 'timeout') {
        throw new Error('Import timed out - neither success nor error state was reached');
      }

      await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    });

    await test.step('Verify collection name appears in location modal', async () => {
      const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
      await expect(locationModal.getByText('bruno-with-examples')).toBeVisible();
      await page.getByTestId('modal-close-button').click();
    });
  });
});
