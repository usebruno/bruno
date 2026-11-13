import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  openCollectionSettings,
  selectCollectionPaneTab
} from '../../utils/page';
import {
  editCollectionHeaderValue,
  fillCollectionHeaderRow,
  switchToBulkEdit,
  switchToKeyValue,
  writeBulkEditHeaders
} from '../../utils/page/collection/settings-headers';

const collectionName = 'headers-bulk-sync';

test.describe('Collection headers Key/Value and Bulk Edit sync', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-731: verify that the Real-time synchronization between Key/Value and Bulk Edit views under collection headers', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const headersTable = page.getByTestId('collection-headers');
    const bulkEditor = page.getByTestId('bulk-edit-editor');
    const headerName = (name: string) => headersTable.getByTestId('column-name').getByText(name, { exact: true });
    const headerValue = (value: string) => headersTable.getByTestId('column-value').getByText(value, { exact: true });
    const bulkLine = (text: string) => bulkEditor.getByText(text, { exact: true });

    await test.step('Create a collection with an existing header in Key/Value view', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await expect(page.getByTestId('sidebar-collection-row').getByText(collectionName, { exact: true })).toBeVisible();
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'headers');
      await headersTable.waitFor({ state: 'visible' });
      await fillCollectionHeaderRow(page, 'X-Existing', 'original');
      await expect(headerName('X-Existing')).toBeVisible();
      await expect(headerValue('original')).toBeVisible();
    });

    await test.step('Bulk Edit shows the existing header as key:value', async () => {
      await switchToBulkEdit(page);
      await expect(bulkLine('X-Existing:original')).toBeVisible();
    });

    await test.step('A header added in Bulk Edit appears in Key/Value view', async () => {
      await writeBulkEditHeaders(page, 'X-Existing:original\nnewParam:testValue');
      await switchToKeyValue(page);
      await expect(headerName('newParam')).toBeVisible();
      await expect(headerValue('original')).toBeVisible();
      await expect(headerValue('testValue')).toBeVisible();
    });

    await test.step('An edit in Key/Value view is reflected in Bulk Edit', async () => {
      await editCollectionHeaderValue(page, 'X-Existing', 'updated');
      await expect(headerValue('updated')).toBeVisible();
      await expect(headerValue('original')).toHaveCount(0);
      await switchToBulkEdit(page);
      await expect(bulkLine('X-Existing:updated')).toBeVisible();
      await expect(bulkLine('newParam:testValue')).toBeVisible();
      await expect(bulkLine('X-Existing:updatedoriginal')).toHaveCount(0);
    });

    await test.step('A header deleted in Bulk Edit is gone from Key/Value view', async () => {
      await writeBulkEditHeaders(page, 'X-Existing:updated');
      await switchToKeyValue(page);
      await expect(headerName('X-Existing')).toBeVisible();
      await expect(headerValue('updated')).toBeVisible();
      await expect(headerName('newParam')).toHaveCount(0);
    });

    await test.step('Toggling views keeps later edits in sync', async () => {
      await switchToBulkEdit(page);
      await writeBulkEditHeaders(page, 'X-Existing:updated\nX-Rapid:one');
      await switchToKeyValue(page);
      await expect(headerValue('one')).toBeVisible();
      await editCollectionHeaderValue(page, 'X-Rapid', 'two');
      await expect(headerValue('two')).toBeVisible();
      await expect(headerValue('one')).toHaveCount(0);
      await switchToBulkEdit(page);
      await expect(bulkLine('X-Existing:updated')).toBeVisible();
      await expect(bulkLine('X-Rapid:two')).toBeVisible();
      await expect(bulkLine('X-Rapid:twoone')).toHaveCount(0);
      await switchToKeyValue(page);
      await expect(headerValue('two')).toBeVisible();
    });
  });
});
