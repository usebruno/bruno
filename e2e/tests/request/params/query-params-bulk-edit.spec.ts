import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  buildRequestLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab
} from '../../../pages';
import {
  addQueryParam,
  editQueryParamValue,
  switchQueryParamsToBulkEdit,
  switchQueryParamsToKeyValue,
  replaceQueryParamsInBulkEditor
} from '../../../pages/request/params';

const collectionName = 'query-params-bulk-sync';
const requestName = 'echo-params';

test.describe('Request query params Key/Value and Bulk Edit sync', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-731: verify Real-time synchronization between Key/Value and Bulk Edit views for query params', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const { sidebar } = buildCommonLocators(page);
    const { queryParams } = buildRequestLocators(page);

    await test.step('Create a request with an existing query param in Key/Value view', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await expect(sidebar.collectionExact(collectionName)).toBeVisible();
      await createRequest(page, requestName, collectionName, { url: 'http://localhost:8081/ping' });
      await selectRequestPaneTab(page, 'Params');
      await queryParams.table().waitFor({ state: 'visible' });
      await addQueryParam(page, 'existing', 'original');
      await expect(queryParams.rowByName('existing')).toBeVisible();
      await expect(queryParams.valueByNameText('existing')).toHaveText('original');
    });

    await test.step('Bulk Edit shows the existing param as key:value', async () => {
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkEditorLine('existing:original')).toBeVisible();
    });

    await test.step('A param added in Bulk Edit appears in Key/Value view', async () => {
      await replaceQueryParamsInBulkEditor(page, 'existing:original\nnewParam:testValue');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.rowByName('newParam')).toBeVisible();
      await expect(queryParams.valueByNameText('existing')).toHaveText('original');
      await expect(queryParams.valueByNameText('newParam')).toHaveText('testValue');
    });

    await test.step('An edit in Key/Value view is reflected in Bulk Edit', async () => {
      await editQueryParamValue(page, 'existing', 'updated');
      await expect(queryParams.valueByNameText('existing')).toHaveText('updated');
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkEditorLine('existing:updated')).toBeVisible();
      await expect(queryParams.bulkEditorLine('newParam:testValue')).toBeVisible();
      await expect(queryParams.bulkEditorLine('existing:original')).toHaveCount(0);
    });

    await test.step('A param deleted in Bulk Edit is gone from Key/Value view', async () => {
      await replaceQueryParamsInBulkEditor(page, 'existing:updated');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.rowByName('existing')).toBeVisible();
      await expect(queryParams.valueByNameText('existing')).toHaveText('updated');
      await expect(queryParams.rowByName('newParam')).toHaveCount(0);
    });

    await test.step('Toggling views keeps later edits in sync', async () => {
      await switchQueryParamsToBulkEdit(page);
      await replaceQueryParamsInBulkEditor(page, 'existing:updated\nrapid:one');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.valueByNameText('rapid')).toHaveText('one');
      await editQueryParamValue(page, 'rapid', 'two');
      await expect(queryParams.valueByNameText('rapid')).toHaveText('two');
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkEditorLine('existing:updated')).toBeVisible();
      await expect(queryParams.bulkEditorLine('rapid:two')).toBeVisible();
      await expect(queryParams.bulkEditorLine('rapid:one')).toHaveCount(0);
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.valueByNameText('rapid')).toHaveText('two');
    });
  });
});
