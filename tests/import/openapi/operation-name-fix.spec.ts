import { test, expect } from '../../../playwright';
import * as path from 'path';

test.describe('OpenAPI Newline Handling', () => {
  const testDataDir = path.join(__dirname, '../test-data');

  test('should handle operation names with newlines', async ({ pageWithUserData: page, createTmpDir }) => {
    const openApiFile = path.join(testDataDir, 'openapi-newline-test.yaml');

    await page.getByRole('button', { name: 'Import Collection' }).click();

    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', openApiFile);

    await page.locator('#import-collection-loader').waitFor({ state: 'hidden' });

    const locationModal = page.getByRole('dialog');
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');
    await expect(locationModal.getByText('Newline Test Collection')).toBeVisible();

    await page.locator('#collection-location').fill(await createTmpDir('newline-test'));
    await page.getByRole('button', { name: 'Import', exact: true }).click();

    await expect(page.locator('#sidebar-collection-name').filter({ hasText: 'Newline Test Collection' })).toBeVisible();

    await page.locator('#sidebar-collection-name').filter({ hasText: 'Newline Test Collection' }).click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    const requestCount = await page.locator('.collection-item-name').count();
    expect(requestCount).toBe(2);

    // close the collection
    await page.locator('#sidebar-collection-name').filter({ hasText: 'Newline Test Collection' }).click();
    await page.locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.locator('.bruno-logo').click();
  });
});
