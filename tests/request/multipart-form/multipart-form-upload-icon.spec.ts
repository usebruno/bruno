import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, openCollection, openRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe.serial('Multipart Form - Upload Icon Visibility', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.beforeAll(async ({ page, createTmpDir }) => {
    await test.step('Create collection and request', async () => {
      await createCollection(page, 'multipart-upload-icon', await createTmpDir('multipart-upload-icon'));
      await createRequest(page, 'test-multipart', '', {
        url: 'https://httpbin.org/post',
        method: 'POST',
        inFolder: false
      });
    });

    await test.step('Open the request', async () => {
      await openCollection(page, 'multipart-upload-icon');
      await openRequest(page, 'multipart-upload-icon', 'test-multipart', { persist: true });
    });

    await test.step('Switch body mode to Multipart Form', async () => {
      await selectRequestPaneTab(page, 'Body');
      const locators = buildCommonLocators(page);
      await locators.request.bodyModeSelector().click();
      await page.locator('.dropdown-item').filter({ hasText: 'Multipart Form' }).click();
    });
  });

  test('upload icon should be visible on the empty last row', async ({ page }) => {
    await test.step('Verify upload icon is visible on the empty row', async () => {
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(1);
      const uploadBtn = rows.first().locator('.upload-btn');
      await expect(uploadBtn).toBeVisible();
    });
  });

  test('upload icon should be visible after entering a key', async ({ page }) => {
    await test.step('Enter a key in the empty row', async () => {
      const row = page.locator('table tbody tr').first();
      const nameCell = row.locator('td').nth(1);
      await nameCell.locator('input').fill('myfield');
      // Press Tab to commit the value
      await page.keyboard.press('Tab');
    });

    await test.step('Verify upload icon is visible on the row with the key', async () => {
      // Wait for the new empty row to appear (should now have 2 rows)
      await expect(page.locator('table tbody tr')).toHaveCount(2);
      // The first row has our key, check its upload button
      const uploadBtn = page.locator('table tbody tr').first().locator('.upload-btn');
      await expect(uploadBtn).toBeVisible();
    });
  });

  test('upload icon should remain visible after entering a value', async ({ page }) => {
    await test.step('Enter a value in the first row', async () => {
      const firstRow = page.locator('table tbody tr').first();
      const editor = firstRow.locator('.value-cell .CodeMirror');
      await editor.click({ position: { x: 10, y: 10 } });
      await page.keyboard.type('some text value');
    });

    await test.step('Verify upload icon is still visible with text value', async () => {
      const uploadBtn = page.locator('table tbody tr').first().locator('.upload-btn');
      await expect(uploadBtn).toBeVisible();
    });
  });
});
