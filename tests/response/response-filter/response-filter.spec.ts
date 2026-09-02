import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestBodyMode,
  sendRequestAndWaitForResponse,
  setCodeMirrorValue,
  switchResponseFormat
} from '../../utils/page';

const ECHO_URL = 'http://localhost:8081/api/echo/json';
const BOOKS = JSON.stringify({
  store: {
    books: [
      { title: 'Sayings of the Century', author: 'Nigel Rees', price: 8.95 },
      { title: 'Sword of Honour', author: 'Evelyn Waugh', price: 12.99 }
    ]
  }
});

test.describe('Response filter', () => {
  test.beforeEach(async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-filter', await createTmpDir('response-filter'));
    await createRequest(page, 'echo', 'response-filter', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-filter', 'echo');

    await selectRequestBodyMode(page, 'JSON');
    await setCodeMirrorValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), BOOKS);
    await sendRequestAndWaitForResponse(page);
    await switchResponseFormat(page, 'JSON');

    await buildCommonLocators(page).response.filter.toggleIcon().click();
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('filters with JSONPath by default', async ({ page }) => {
    const { response } = buildCommonLocators(page);

    await expect(response.filter.typeButton('jsonpath')).toContainClass('active');
    await response.filter.input().fill('$.store.books[*].author');

    await expect(response.previewContainer()).toContainText('Evelyn Waugh');
    await expect(response.previewContainer()).not.toContainText('Sword of Honour');
  });

  test('filters with jq once selected', async ({ page }) => {
    const { response } = buildCommonLocators(page);

    await response.filter.typeButton('jq').click();
    await expect(response.filter.typeButton('jq')).toContainClass('active');
    await response.filter.input().fill('[.store.books[] | select(.price > 10) | .title]');

    await expect(response.previewContainer()).toContainText('Sword of Honour');
    await expect(response.previewContainer()).not.toContainText('Sayings of the Century');
    await expect(response.filter.jqError()).toBeHidden();
  });

  test('shows the jq error and the unfiltered response for an invalid jq filter', async ({ page }) => {
    const { response } = buildCommonLocators(page);

    await response.filter.typeButton('jq').click();
    await response.filter.input().fill('.store.books[');

    await expect(response.filter.jqError()).toContainText('syntax error');
    await expect(response.previewContainer()).toContainText('Sayings of the Century');
  });

  test('switching the filter type clears the expression and any jq error', async ({ page }) => {
    const { response } = buildCommonLocators(page);

    await response.filter.typeButton('jq').click();
    await response.filter.input().fill('.store.books[');
    await expect(response.filter.jqError()).toBeVisible();

    await response.filter.typeButton('jsonpath').click();

    await expect(response.filter.typeButton('jsonpath')).toContainClass('active');
    await expect(response.filter.input()).toHaveValue('');
    await expect(response.filter.jqError()).toBeHidden();
    await expect(response.previewContainer()).toContainText('Sword of Honour');
  });
});
