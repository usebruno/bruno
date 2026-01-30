import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  saveRequest,
  expectResponseContains
} from '../../utils/page';

test.describe('Form URL Encoding with Content-Type Parameters', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Should encode form params correctly without explicit Content-Type header', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-test';
    const requestName = 'form-basic';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();

      // Change method to POST
      await page.locator('.method-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'POST' }).click();

      // Select Body tab and switch to form-urlencoded
      await selectRequestPaneTab(page, 'Body');
      await page.locator('.body-mode-selector').click();
      await page.locator('[data-item-id="formUrlEncoded"]').click();

      // Add form parameters with special characters
      const formTable = page.locator('table').first();
      const firstRow = formTable.locator('tbody tr').first();

      await firstRow.locator('input[placeholder="Key"]').fill('foo');
      await firstRow.locator('.CodeMirror').click();
      await firstRow.locator('textarea').fill('bar');

      // Add second parameter
      const secondRow = formTable.locator('tbody tr').nth(1);
      await secondRow.locator('input[placeholder="Key"]').fill('baz');
      await secondRow.locator('.CodeMirror').click();
      await secondRow.locator('textarea').fill('test');

      await saveRequest(page);
    });

    await test.step('Send request', async () => {
      // Send request
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 15000 });
    });

    await test.step('Validate response', async () => {
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

      // Verify response contains properly encoded data
      await expectResponseContains(page, ['foo=bar&baz=test']);
    });
  });

  test('Should encode form params correctly WITH Content-Type header including charset', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-charset-test';
    const requestName = 'form-with-charset';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();

      // Change method to POST
      await page.locator('.method-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'POST' }).click();

      // Add Content-Type header with charset parameter
      await selectRequestPaneTab(page, 'Headers');
      const headerTable = page.locator('table').first();
      const headerRow = headerTable.locator('tbody tr').first();

      await headerRow.locator('.CodeMirror').first().click();
      await headerRow.locator('textarea').first().fill('Content-Type');

      await headerRow.locator('.CodeMirror').nth(1).click();
      await headerRow.locator('textarea').nth(1).fill('application/x-www-form-urlencoded; charset=utf-8');

      // Select Body tab and switch to form-urlencoded
      await selectRequestPaneTab(page, 'Body');
      await page.locator('.body-mode-selector').click();
      await page.locator('[data-item-id="formUrlEncoded"]').click();

      // Add form parameters with special characters
      const formTable = page.locator('table').first();
      const firstRow = formTable.locator('tbody tr').first();

      await firstRow.locator('input[placeholder="Key"]').fill('foo');
      await firstRow.locator('.CodeMirror').click();
      await firstRow.locator('textarea').fill('bar');

      // Add second parameter
      const secondRow = formTable.locator('tbody tr').nth(1);
      await secondRow.locator('input[placeholder="Key"]').fill('baz');
      await secondRow.locator('.CodeMirror').click();
      await secondRow.locator('textarea').fill('test');

      await saveRequest(page);
    });

    await test.step('Send request', async () => {
      // Send request
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 15000 });
    });

    await test.step('Verify response', async () => {
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

      // Verify response contains properly encoded data
      await expectResponseContains(page, ['foo=bar&baz=test']);
    });
  });

  test('Should encode form params correctly with multiple Content-Type parameters', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-multiple-params-test';
    const requestName = 'form-multiple-params';

    await test.step('Setup request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: 'https://echo.usebruno.com' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();
      // Change method to POST
      await page.locator('.method-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'POST' }).click();

      // Add Content-Type header with multiple parameters
      await selectRequestPaneTab(page, 'Headers');
      const headerTable = page.locator('table').first();
      const headerRow = headerTable.locator('tbody tr').first();

      await headerRow.locator('.CodeMirror').first().click();
      await headerRow.locator('textarea').first().fill('Content-Type');

      await headerRow.locator('.CodeMirror').nth(1).click();
      await headerRow
        .locator('textarea')
        .nth(1)
        .fill('application/x-www-form-urlencoded; charset=utf-8; boundary=something');

      // Select Body tab and switch to form-urlencoded
      await selectRequestPaneTab(page, 'Body');
      await page.locator('.body-mode-selector').click();
      await page.locator('[data-item-id="formUrlEncoded"]').click();

      // Add form parameters
      const formTable = page.locator('table').first();
      const firstRow = formTable.locator('tbody tr').first();

      await firstRow.locator('input[placeholder="Key"]').fill('test');
      await firstRow.locator('.CodeMirror').click();
      await firstRow.locator('textarea').fill('value with spaces');

      await saveRequest(page);
    });

    await test.step('Send request', async () => {
      // Send request
      await page.getByTestId('send-arrow-icon').click();
      await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout: 15000 });
    });

    await test.step('Verify response', async () => {
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      // Verify response contains properly encoded data
      await expectResponseContains(page, ['test=value+with+spaces']);
    });
  });
});
