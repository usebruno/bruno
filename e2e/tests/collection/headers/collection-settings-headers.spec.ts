import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  expandTimelineEntry,
  selectCollectionPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../../pages';
import {
  buildCollectionSettingsHeadersLocators,
  openCollectionHeadersTab,
  pickHeaderHint
} from '../../../pages/collection/settings-headers';
import { fillRequestHeaderName, fillRequestHeaderValue } from '../../../pages/request/headers';

const ECHO_HEADERS_URL = 'http://localhost:8081/headers';

test.describe('Collection settings headers', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-2625: Navigate to Headers Tab from API Collection UI', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersNavigate';
    const { paneTabs } = buildCommonLocators(page);
    const collectionSettingsHeaders = buildCollectionSettingsHeadersLocators(page);

    await test.step('Open a collection on the Overview tab', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await expect(paneTabs.collectionSettingsTab('overview')).toContainClass('active');
    });

    await test.step('Verify that Headers becomes the active tab', async () => {
      await selectCollectionPaneTab(page, 'headers');
      await expect(paneTabs.collectionSettingsTab('headers')).toContainClass('active');
    });

    await test.step('The header table, Bulk Edit, and Save are shown', async () => {
      await expect(collectionSettingsHeaders.nameColumnHeader()).toBeVisible();
      await expect(collectionSettingsHeaders.valueColumnHeader()).toBeVisible();
      await expect(collectionSettingsHeaders.bulkEditToggle()).toBeVisible();
      await expect(collectionSettingsHeaders.saveButton()).toBeVisible();
    });
  });

  test('TC-2626: Add a Single Request Header with Valid Name and Value', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersAdd';
    const collectionSettingsHeaders = buildCollectionSettingsHeadersLocators(page);

    await test.step('Open the Headers tab of a new collection', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await openCollectionHeadersTab(page, collectionName);
      await expect(collectionSettingsHeaders.rows()).toHaveCount(1);
    });

    await test.step('Choose Content-Type from the name suggestions', async () => {
      await pickHeaderHint(
        page,
        collectionSettingsHeaders.nameEditor(collectionSettingsHeaders.rows().first()),
        'Content-Ty',
        'Content-Type'
      );
    });

    await test.step('Choose application/json from the value suggestions', async () => {
      await pickHeaderHint(
        page,
        collectionSettingsHeaders.valueEditor(collectionSettingsHeaders.rows().first()),
        'application/js',
        'application/json'
      );
    });

    await test.step('The table shows the header that was entered', async () => {
      const row = collectionSettingsHeaders.rowByName('Content-Type');
      await expect(collectionSettingsHeaders.nameCell(row)).toContainText('Content-Type');
      await expect(collectionSettingsHeaders.valueCell(row)).toContainText('application/json');
    });
  });

  test('TC-2627: Save Added Headers Using the Save Button', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersSave';
    const headerName = 'X-Collection';
    const headerValue = 'from-collection';
    const { toast, timeline, timelineHeaders } = buildCommonLocators(page);
    const collectionSettingsHeaders = buildCollectionSettingsHeadersLocators(page);

    await test.step('Enter a header on the Headers tab', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await openCollectionHeadersTab(page, collectionName);
      const row = collectionSettingsHeaders.rows().first();
      await fillRequestHeaderName(page, row, headerName);
      await fillRequestHeaderValue(page, row, headerValue);
    });

    await test.step('Save persists the header', async () => {
      await collectionSettingsHeaders.saveButton().click();
      await expect(toast.byMessage('Collection Settings saved successfully')).toBeVisible();
    });

    await test.step('The saved header is on the request timeline', async () => {
      await createRequest(page, 'Echo headers', collectionName, { url: ECHO_HEADERS_URL });
      await sendRequest(page, 200);

      await selectResponsePaneTab(page, 'Timeline');
      await expandTimelineEntry(page, timeline.entriesOfKind('main').first());
      await expect(timelineHeaders.value(headerName)).toHaveText(headerValue);
    });
  });

  test('TC-2629: Toggle Between Key/Value View and Bulk Edit View', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersBulk';
    const headerName = 'X-Bulk';
    const headerValue = 'bulk-value';
    const collectionSettingsHeaders = buildCollectionSettingsHeadersLocators(page);

    await test.step('Add a header on the Headers tab', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await openCollectionHeadersTab(page, collectionName);
      const row = collectionSettingsHeaders.rows().first();
      await fillRequestHeaderName(page, row, headerName);
      await fillRequestHeaderValue(page, row, headerValue);
    });

    await test.step('Bulk Edit shows the header as text', async () => {
      await collectionSettingsHeaders.bulkEditToggle().click();
      await expect(collectionSettingsHeaders.bulkEditor()).toBeVisible();
      await expect(collectionSettingsHeaders.bulkEditor()).toContainText(`${headerName}:${headerValue}`);
      await expect(collectionSettingsHeaders.table()).toBeHidden();
    });

    await test.step('Key/Value Edit restores the table row', async () => {
      await collectionSettingsHeaders.keyValueEditToggle().click();
      const row = collectionSettingsHeaders.rowByName(headerName);
      await expect(collectionSettingsHeaders.nameCell(row)).toContainText(headerName);
      await expect(collectionSettingsHeaders.valueCell(row)).toContainText(headerValue);
    });
  });
});
