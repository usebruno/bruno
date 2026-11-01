import { test, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  selectRequestBodyMode,
  saveRequest,
  sendRequestAndWaitForResponse,
  expectResponseContains
} from '../../utils/page';
import { fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

const ECHO_URL = 'http://localhost:8081/api/echo/everything';
const FORM_URL_ENCODED_BODY_MODE = 'Form URL Encoded';

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

  test('Should send form params url-encoded when no Content-Type header is set', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-test';
    const requestName = 'form-basic';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: ECHO_URL, method: 'POST' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await openRequest(page, collectionName, requestName);

      await selectRequestBodyMode(page, FORM_URL_ENCODED_BODY_MODE);
      await fillFormUrlEncodedParam(page, 0, 'foo', 'bar');
      await fillFormUrlEncodedParam(page, 1, 'baz', 'test');

      await saveRequest(page);
    });

    await sendRequestAndWaitForResponse(page, 200);

    await test.step('Verify response', async () => {
      await expectResponseContains(page, ['foo=bar&baz=test']);
    });
  });

  test('Should send form params url-encoded with the charset Content-Type when the header has a charset', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-charset-test';
    const requestName = 'form-with-charset';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: ECHO_URL, method: 'POST' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await openRequest(page, collectionName, requestName);

      await selectRequestPaneTab(page, 'Headers');
      await addContentTypeHeader(page, 'application/x-www-form-urlencoded; charset=utf-8');

      await selectRequestBodyMode(page, FORM_URL_ENCODED_BODY_MODE);
      await fillFormUrlEncodedParam(page, 0, 'foo', 'bar');
      await fillFormUrlEncodedParam(page, 1, 'baz', 'test');

      await saveRequest(page);
    });

    await sendRequestAndWaitForResponse(page, 200);

    await test.step('Verify response', async () => {
      await expectResponseContains(page, [
        'foo=bar&baz=test',
        '"content-type": "application/x-www-form-urlencoded; charset=utf-8"'
      ]);
    });
  });

  test('Should send form params url-encoded with every Content-Type parameter when the header has several', async ({ page, createTmpDir }) => {
    const collectionName = 'form-encoding-multiple-params-test';
    const requestName = 'form-multiple-params';

    await test.step('Create collection and request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await createRequest(page, requestName, collectionName, { url: ECHO_URL, method: 'POST' });
    });

    await test.step('Navigate to request and populate fields', async () => {
      await openRequest(page, collectionName, requestName);

      await selectRequestPaneTab(page, 'Headers');
      await addContentTypeHeader(page, 'application/x-www-form-urlencoded; charset=utf-8; boundary=something');

      await selectRequestBodyMode(page, FORM_URL_ENCODED_BODY_MODE);
      await fillFormUrlEncodedParam(page, 0, 'test', 'value with spaces');

      await saveRequest(page);
    });

    await sendRequestAndWaitForResponse(page, 200);

    await test.step('Verify response', async () => {
      await expectResponseContains(page, [
        'test=value+with+spaces',
        '"content-type": "application/x-www-form-urlencoded; charset=utf-8; boundary=something"'
      ]);
    });
  });
});
