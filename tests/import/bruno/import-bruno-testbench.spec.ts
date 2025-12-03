import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections } from '../../utils/page';

test.describe('Import Bruno Testbench Collection', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Import Bruno Testbench collection successfully', async ({ page, createTmpDir }) => {
    const brunoFile = path.resolve(__dirname, 'fixtures', 'bruno-testbench.json');

    await page.locator('.plus-icon-button').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import collection modal to be ready
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', brunoFile);

    // Wait for location modal to appear after file processing
    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Wait for collection to appear in the location modal
    await expect(locationModal.getByText('bruno-testbench')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('bruno-testbench-test'));
    await locationModal.getByRole('button', { name: 'Import' }).click();

    await expect(page.locator('#sidebar-collection-name').getByText('bruno-testbench')).toBeVisible();
  });
});
