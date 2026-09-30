import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  saveRequest,
  expectResponseContains
} from '../../utils/page';
import { fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

const ECHO_URL = 'http://localhost:8081/api/echo/everything';

const fillFormUrlEncodedParam = async (page: Page, rowIndex: number, name: string, value: string) => {
  const formTable = buildCommonLocators(page).table('form-urlencoded-table');
  const row = formTable.row(rowIndex);
  await formTable.rowNameInput(row).fill(name);
  await formTable.rowValueEditor(row).click();
  await page.keyboard.type(value);
};

const addContentTypeHeader = async (page: Page, value: string) => {
  const { headers } = buildCommonLocators(page).request;
  await fillRequestHeaderName(page, headers.addRow(), 'Content-Type');
  await fillRequestHeaderValue(page, headers.requestRow('Content-Type'), value);
};

test.describe('Form URL Encoding with Content-Type Parameters', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Should encode form params correctly without explicit Content-Type header', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-test';
    const requestName = 'form-basic';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: ECHO_URL });
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

      await fillFormUrlEncodedParam(page, 0, 'foo', 'bar');
      await fillFormUrlEncodedParam(page, 1, 'baz', 'test');

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
      await createRequest(page, requestName, collectionName, { url: ECHO_URL });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();

      // Change method to POST
      await page.locator('.method-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'POST' }).click();

      // Add Content-Type header with charset parameter
      await selectRequestPaneTab(page, 'Headers');
      await addContentTypeHeader(page, 'application/x-www-form-urlencoded; charset=utf-8');

      // Select Body tab and switch to form-urlencoded
      await selectRequestPaneTab(page, 'Body');
      await page.locator('.body-mode-selector').click();
      await page.locator('[data-item-id="formUrlEncoded"]').click();

      await fillFormUrlEncodedParam(page, 0, 'foo', 'bar');
      await fillFormUrlEncodedParam(page, 1, 'baz', 'test');

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
      await createRequest(page, requestName, collectionName, { url: ECHO_URL });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await page.locator('.collection-item-name').filter({ hasText: requestName }).first().click();
      // Change method to POST
      await page.locator('.method-selector').click();
      await page.locator('.dropdown-item').filter({ hasText: 'POST' }).click();

      // Add Content-Type header with multiple parameters
      await selectRequestPaneTab(page, 'Headers');
      await addContentTypeHeader(page, 'application/x-www-form-urlencoded; charset=utf-8; boundary=something');

      // Select Body tab and switch to form-urlencoded
      await selectRequestPaneTab(page, 'Body');
      await page.locator('.body-mode-selector').click();
      await page.locator('[data-item-id="formUrlEncoded"]').click();

      await fillFormUrlEncodedParam(page, 0, 'test', 'value with spaces');

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
