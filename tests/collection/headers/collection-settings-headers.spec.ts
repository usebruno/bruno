import { test, expect, Page } from '../../../playwright';
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

const headerRows = (page: Page) => page.getByTestId('collection-headers').locator('tbody tr');

const fillHeaderCell = async (cell: ReturnType<Page['locator']>, value: string) => {
  await cell.locator('.CodeMirror').evaluate((el, next) => {
    const cm = (el as { CodeMirror?: { setValue: (text: string) => void } }).CodeMirror;
    if (!cm) {
      throw new Error('CodeMirror instance not attached to the header cell');
    }
    cm.setValue(next);
  }, value);
  await expect(cell).toContainText(value);
};

const typeAndPickHint = async (page: Page, editor: ReturnType<Page['locator']>, typed: string, hintText: string) => {
  await editor.click();
  await page.keyboard.type(typed, { delay: 40 });

  const hint = page.locator('.CodeMirror-hints .CodeMirror-hint').filter({ hasText: hintText }).first();
  await expect(hint).toBeVisible();
  await hint.click();
  await expect(editor).toContainText(hintText);
};

test.describe('Collection settings headers', () => {
  test.setTimeout(90 * 1000);

  test('TC-2625: Navigate to Headers Tab from API Collection UI', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersNavigate';

    await test.step('Open a collection on the Overview tab', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('tc-2625'));
      await expect(page.getByTestId('collection-settings-tab-overview')).toContainClass('active');
    });

    await test.step('Headers becomes the active tab', async () => {
      await selectCollectionPaneTab(page, 'headers');
    });

    await test.step('The header table, Bulk Edit, and Save are shown', async () => {
      const table = page.getByTestId('collection-headers');
      await expect(table.locator('.column-name').getByText('Name', { exact: true })).toBeVisible();
      await expect(table.locator('.column-name').getByText('Value', { exact: true })).toBeVisible();
      await expect(page.getByTestId('bulk-edit-toggle')).toBeVisible();
      await expect(page.getByTestId('collection-settings-content').getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    });
  });

  test('TC-2626: Add a Single Request Header with Valid Name and Value', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersAdd';

    await test.step('Open the Headers tab of a new collection', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('tc-2626'));
      await openHeaders(page, collectionName);
      await expect(headerRows(page)).toHaveCount(1);
    });

    await test.step('Choose Content-Type from the name suggestions', async () => {
      const nameEditor = headerRows(page).first().getByTestId('column-name').locator('.CodeMirror');
      await typeAndPickHint(page, nameEditor, 'Content-Ty', 'Content-Type');
    });

    await test.step('Choose application/json from the value suggestions', async () => {
      const valueEditor = headerRows(page).first().getByTestId('column-value').locator('.CodeMirror');
      await typeAndPickHint(page, valueEditor, 'application/js', 'application/json');
    });

    await test.step('The table shows the header that was entered', async () => {
      const row = page.getByTestId('collection-headers').locator('tbody tr[data-row-name="Content-Type"]');
      await expect(row.getByTestId('column-name')).toContainText('Content-Type');
      await expect(row.getByTestId('column-value')).toContainText('application/json');
    });
  });

  test('TC-2627: Save Added Headers Using the Save Button', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'HeadersSave';
    const headerName = 'X-Collection';
    const headerValue = 'from-collection';

    await test.step('Enter a header on the Headers tab', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('tc-2627'));
      await openHeaders(page, collectionName);

      const row = headerRows(page).first();
      await fillHeaderCell(row.getByTestId('column-name'), headerName);
      await fillHeaderCell(row.getByTestId('column-value'), headerValue);
    });

    await test.step('Save persists the header', async () => {
      const save = page.getByTestId('collection-settings-content').getByRole('button', { name: 'Save', exact: true });
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
      await expect(page.getByText('Collection Settings saved successfully')).toBeVisible();
    });

    await test.step('The saved header is on the request timeline', async () => {
      await createRequest(page, 'Echo headers', collectionName, { url: ECHO_HEADERS_URL });
      await sendRequest(page, 200);

      const { timeline } = buildCommonLocators(page);
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

    await test.step('Add a header on the Headers tab', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await createCollection(page, collectionName, await createTmpDir('tc-2629'));
      await openHeaders(page, collectionName);

      const row = headerRows(page).first();
      await fillHeaderCell(row.getByTestId('column-name'), headerName);
      await fillHeaderCell(row.getByTestId('column-value'), headerValue);
    });

    await test.step('Bulk Edit shows the header as text', async () => {
      await page.getByTestId('bulk-edit-toggle').click();
      const editor = page.getByTestId('collection-settings-content').locator('.CodeMirror').first();
      await expect(editor).toBeVisible();
      await expect(editor).toContainText(`${headerName}:${headerValue}`);
      await expect(page.getByTestId('collection-headers')).toBeHidden();
    });

    await test.step('Key/Value Edit restores the table row', async () => {
      await page.getByTestId('key-value-edit-toggle').click();
      const row = page.getByTestId('collection-headers').locator(`tbody tr[data-row-name="${headerName}"]`);
      await expect(row.getByTestId('column-name')).toContainText(headerName);
      await expect(row.getByTestId('column-value')).toContainText(headerValue);
    });
  });
});
