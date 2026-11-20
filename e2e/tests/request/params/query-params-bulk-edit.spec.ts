import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  buildRequestLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  editQueryParamValue,
  fillQueryParamRow,
  selectRequestPaneTab,
  switchQueryParamsToBulkEdit,
  switchQueryParamsToKeyValue,
  writeBulkEditQueryParams
} from '../../../pages';

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
      await fillQueryParamRow(page, 'existing', 'original');
      await expect(queryParams.nameText('existing')).toBeVisible();
      await expect(queryParams.valueText('original')).toBeVisible();
    });

    await test.step('Bulk Edit shows the existing param as key:value', async () => {
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkLine('existing:original')).toBeVisible();
    });

    await test.step('A param added in Bulk Edit appears in Key/Value view', async () => {
      await writeBulkEditQueryParams(page, 'existing:original\nnewParam:testValue');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.nameText('newParam')).toBeVisible();
      await expect(queryParams.valueText('original')).toBeVisible();
      await expect(queryParams.valueText('testValue')).toBeVisible();
    });

    await test.step('An edit in Key/Value view is reflected in Bulk Edit', async () => {
      await editQueryParamValue(page, 'existing', 'updated');
      await expect(queryParams.valueText('updated')).toBeVisible();
      await expect(queryParams.valueText('original')).toHaveCount(0);
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkLine('existing:updated')).toBeVisible();
      await expect(queryParams.bulkLine('newParam:testValue')).toBeVisible();
      await expect(queryParams.bulkLine('existing:updatedoriginal')).toHaveCount(0);
    });

    await test.step('A param deleted in Bulk Edit is gone from Key/Value view', async () => {
      await writeBulkEditQueryParams(page, 'existing:updated');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.nameText('existing')).toBeVisible();
      await expect(queryParams.valueText('updated')).toBeVisible();
      await expect(queryParams.nameText('newParam')).toHaveCount(0);
    });

    await test.step('Toggling views keeps later edits in sync', async () => {
      await switchQueryParamsToBulkEdit(page);
      await writeBulkEditQueryParams(page, 'existing:updated\nrapid:one');
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.valueText('one')).toBeVisible();
      await editQueryParamValue(page, 'rapid', 'two');
      await expect(queryParams.valueText('two')).toBeVisible();
      await expect(queryParams.valueText('one')).toHaveCount(0);
      await switchQueryParamsToBulkEdit(page);
      await expect(queryParams.bulkLine('existing:updated')).toBeVisible();
      await expect(queryParams.bulkLine('rapid:two')).toBeVisible();
      await expect(queryParams.bulkLine('rapid:twoone')).toHaveCount(0);
      await switchQueryParamsToKeyValue(page);
      await expect(queryParams.valueText('two')).toBeVisible();
    });
  });
});
