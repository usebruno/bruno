import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, openCollection, selectRequestPaneTab } from '../../utils/page';
import { getTableCell } from '../../utils/page/locators';

test.describe('Header Validation', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should show error icon when header name contains spaces', async ({ page, createTmpDir }) => {
    await test.step('Create collection and request', async () => {
      await createCollection(page, 'header-validation', await createTmpDir('header-validation'));

      const collection = page.getByTestId('collections').locator('.collection-name').filter({ hasText: 'header-validation' });
      await collection.hover();
      await collection.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
      await page.getByPlaceholder('Request Name').fill('test-headers');
      await page.locator('#new-request-url').locator('.CodeMirror').click();
      await page.locator('#new-request-url').locator('textarea').fill('https://httpbin.org/get');
      await page.locator('.bruno-modal').getByRole('button', { name: 'Create', exact: true }).click();
    });

    await test.step('Open the request', async () => {
      await openCollection(page, 'header-validation');
      await page.locator('.collection-item-name').filter({ hasText: 'test-headers' }).dblclick();
    });

    await test.step('Navigate to Headers tab', async () => {
      await selectRequestPaneTab(page, 'Headers');
    });

    await test.step('Enter header name with space and verify error icon', async () => {
      const headerRow = page.locator('table tbody tr').first();
      const nameCell = getTableCell(headerRow, 0);

      // Click on the CodeMirror editor and type a header name with space
      await nameCell.locator('.CodeMirror').click();
      await nameCell.locator('textarea').fill('invalid header');

      // Verify the error icon is visible
      const errorIcon = headerRow.locator('.text-red-600');
      await expect(errorIcon).toBeVisible();

      // Hover over the error icon to show the tooltip
      await errorIcon.hover();

      // Verify the tooltip message
      const tooltip = page.locator('.tooltip-mod');
      await expect(tooltip).toContainText('Header name cannot contain spaces or newlines');
    });

    await test.step('Enter valid header name and verify no error icon', async () => {
      const headerRow = page.locator('table tbody tr').first();
      const nameCell = getTableCell(headerRow, 0);

      // Clear and enter a valid header name
      await nameCell.locator('.CodeMirror').click();
      await page.keyboard.press('Meta+a');
      await nameCell.locator('textarea').fill('Valid-Header');

      // Verify the error icon is not visible
      const errorIcon = headerRow.locator('.text-red-600');
      await expect(errorIcon).not.toBeVisible();
    });
  });

  test('should show error icon when header value contains newlines', async ({ page }) => {
    await test.step('Navigate to Headers tab', async () => {
      await selectRequestPaneTab(page, 'Headers');
    });

    await test.step('Enter header value with newline and verify error icon', async () => {
      const headerRow = page.locator('table tbody tr').first();
      const valueCell = getTableCell(headerRow, 1);

      // Click on the value CodeMirror editor and type a value with newline
      await valueCell.locator('.CodeMirror').click();
      await valueCell.locator('textarea').fill('header\nValue');

      // Verify the error icon is visible
      const errorIcon = headerRow.locator('.text-red-600');
      await expect(errorIcon).toBeVisible();

      // Hover over the error icon to show the tooltip
      await errorIcon.hover();

      // Verify the tooltip message
      const tooltip = page.locator('.tooltip-mod');
      await expect(tooltip).toContainText('Header value cannot contain newlines');

      // Save the request
      await page.keyboard.press('Control+s');
    });
  });
});
