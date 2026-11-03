import { test, expect, Page, Locator } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createRequest,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../utils/page';
import { buildTimelineHeaderLocators } from '../../utils/page/timeline-headers';

const ECHO_HEADERS_URL = 'http://localhost:8081/headers';

const openHeaders = async (page: Page, collectionName: string) => {
  await openCollectionSettings(page, collectionName);
  await selectCollectionPaneTab(page, 'headers');
};

const fillHeaderCell = async (cell: Locator, value: string) => {
  await cell.locator('.CodeMirror').evaluate((el, next) => {
    const cm = (el as { CodeMirror?: { setValue: (text: string) => void } }).CodeMirror;
    if (!cm) {
      throw new Error('CodeMirror instance not attached to the header cell');
    }
    cm.setValue(next);
  }, value);
  await expect(cell).toContainText(value);
};

const typeAndPickHint = async (page: Page, editor: Locator, typed: string, hintText: string) => {
  await editor.click();
  await page.keyboard.type(typed, { delay: 40 });

  const hint = buildCommonLocators(page).codeMirror.hint(hintText);
  await expect(hint).toBeVisible();
  await hint.click();
  await expect(editor).toContainText(hintText);
};

test.describe('Collection settings headers', () => {
  test.setTimeout(90 * 1000);

  test('TC-2625: Navigate to Headers Tab from API Collection UI', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersNavigate';
    const { collectionSettingsHeaders, paneTabs } = buildCommonLocators(page);

    await test.step('Open a collection on the Overview tab', async () => {
      await createCollection(page, collectionName, await createTmpDir('tc-2625'));
      await expect(paneTabs.collectionSettingsTab('overview')).toContainClass('active');
    });

    await test.step('Headers becomes the active tab', async () => {
      await selectCollectionPaneTab(page, 'headers');
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
    const { collectionSettingsHeaders } = buildCommonLocators(page);

    await test.step('Open the Headers tab of a new collection', async () => {
      await createCollection(page, collectionName, await createTmpDir('tc-2626'));
      await openHeaders(page, collectionName);
      await expect(collectionSettingsHeaders.rows()).toHaveCount(1);
    });

    await test.step('Choose Content-Type from the name suggestions', async () => {
      await typeAndPickHint(page, collectionSettingsHeaders.nameEditor(collectionSettingsHeaders.rows().first()), 'Content-Ty', 'Content-Type');
    });

    await test.step('Choose application/json from the value suggestions', async () => {
      await typeAndPickHint(page, collectionSettingsHeaders.valueEditor(collectionSettingsHeaders.rows().first()), 'application/js', 'application/json');
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
    const { collectionSettingsHeaders, toast, timeline } = buildCommonLocators(page);

    await test.step('Enter a header on the Headers tab', async () => {
      await createCollection(page, collectionName, await createTmpDir('tc-2627'));
      await openHeaders(page, collectionName);

      const row = collectionSettingsHeaders.rows().first();
      await fillHeaderCell(collectionSettingsHeaders.nameCell(row), headerName);
      await fillHeaderCell(collectionSettingsHeaders.valueCell(row), headerValue);
    });

    await test.step('Save persists the header', async () => {
      const save = collectionSettingsHeaders.saveButton();
      await expect(save).toBeVisible();

      const background = await save.evaluate((el) => getComputedStyle(el).backgroundColor);
      const channels = background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      expect(channels, `Save button background was ${background}`).not.toBeNull();
      const red = Number(channels?.[1]);
      const green = Number(channels?.[2]);
      const blue = Number(channels?.[3]);
      expect(red).toBeGreaterThan(180);
      expect(green).toBeGreaterThan(80);
      expect(blue).toBeLessThan(140);

      await save.click();
      await expect(toast.byMessage('Collection Settings saved successfully')).toBeVisible();
    });

    await test.step('The saved header is on the request timeline', async () => {
      await createRequest(page, 'Echo headers', collectionName, { url: ECHO_HEADERS_URL });
      await sendRequest(page, 200);

      await selectResponsePaneTab(page, 'Timeline');
      await timeline.itemHeader(timeline.items().first()).click();

      const timelineHeaders = buildTimelineHeaderLocators(page);
      await expect(timelineHeaders.value(headerName)).toHaveText(headerValue);
    });
  });

  test('TC-2629: Toggle Between Key/Value View and Bulk Edit View', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersBulk';
    const headerName = 'X-Bulk';
    const headerValue = 'bulk-value';
    const { collectionSettingsHeaders } = buildCommonLocators(page);

    await test.step('Add a header on the Headers tab', async () => {
      await createCollection(page, collectionName, await createTmpDir('tc-2629'));
      await openHeaders(page, collectionName);

      const row = collectionSettingsHeaders.rows().first();
      await fillHeaderCell(collectionSettingsHeaders.nameCell(row), headerName);
      await fillHeaderCell(collectionSettingsHeaders.valueCell(row), headerValue);
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
