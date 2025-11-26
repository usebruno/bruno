import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('Import Insomnia Collection v5', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Import Insomnia Collection v5 successfully', async ({ page, createTmpDir }) => {
    const insomniaFile = path.resolve(__dirname, 'fixtures', 'insomnia-v5.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', insomniaFile);

    // Wait for the loader to disappear
    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    // Verify that the Import Collection modal is displayed (for location selection)
    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.locator('#collection-location').fill(await createTmpDir('insomnia-v5-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').getByText('Test API Collection v5')).toBeVisible();
  });
});
