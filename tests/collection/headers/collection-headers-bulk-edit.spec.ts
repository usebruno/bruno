import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
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
    const { sidebar, collectionSettingsHeaders } = buildCommonLocators(page);

    await test.step('Create a collection with an existing header in Key/Value view', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'headers');
      await collectionSettingsHeaders.table().waitFor({ state: 'visible' });
      await fillCollectionHeaderRow(page, 'X-Existing', 'original');
      await expect(collectionSettingsHeaders.valueLineByName('X-Existing')).toHaveText('original');
    });

    await test.step('Bulk Edit shows the existing header as key:value', async () => {
      await switchToBulkEdit(page);
      await expect(collectionSettingsHeaders.bulkEditLines()).toHaveText(['X-Existing:original']);
    });

    await test.step('A header added in Bulk Edit appears in Key/Value view', async () => {
      await writeBulkEditHeaders(page, 'X-Existing:original\nnewParam:testValue');
      await switchToKeyValue(page);
      await expect(collectionSettingsHeaders.rowByName('newParam')).toBeVisible();
      await expect(collectionSettingsHeaders.valueLineByName('X-Existing')).toHaveText('original');
      await expect(collectionSettingsHeaders.valueLineByName('newParam')).toHaveText('testValue');
    });

    await test.step('An edit in Key/Value view is reflected in Bulk Edit', async () => {
      await editCollectionHeaderValue(page, 'X-Existing', 'updated');
      await expect(collectionSettingsHeaders.valueLineByName('X-Existing')).toHaveText('updated');
      await switchToBulkEdit(page);
      await expect(collectionSettingsHeaders.bulkEditLines()).toHaveText(['X-Existing:updated', 'newParam:testValue']);
    });

    await test.step('A header deleted in Bulk Edit is gone from Key/Value view', async () => {
      await writeBulkEditHeaders(page, 'X-Existing:updated');
      await switchToKeyValue(page);
      await expect(collectionSettingsHeaders.rowByName('X-Existing')).toBeVisible();
      await expect(collectionSettingsHeaders.valueLineByName('X-Existing')).toHaveText('updated');
      await expect(collectionSettingsHeaders.rowByName('newParam')).toHaveCount(0);
    });

    await test.step('Toggling views keeps later edits in sync', async () => {
      await switchToBulkEdit(page);
      await writeBulkEditHeaders(page, 'X-Existing:updated\nX-Rapid:one');
      await switchToKeyValue(page);
      await expect(collectionSettingsHeaders.valueLineByName('X-Rapid')).toHaveText('one');
      await editCollectionHeaderValue(page, 'X-Rapid', 'two');
      await expect(collectionSettingsHeaders.valueLineByName('X-Rapid')).toHaveText('two');
      await switchToBulkEdit(page);
      await expect(collectionSettingsHeaders.bulkEditLines()).toHaveText(['X-Existing:updated', 'X-Rapid:two']);
      await switchToKeyValue(page);
      await expect(collectionSettingsHeaders.valueLineByName('X-Rapid')).toHaveText('two');
    });
  });
});
