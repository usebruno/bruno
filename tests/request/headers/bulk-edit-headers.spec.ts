import { expect, Locator, Page, test } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../../utils/page';
import { buildRequestLocators, fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

const CHECKED = { name: 'X-Checked', value: 'checked-value' };
const UNCHECKED = { name: 'X-Unchecked', value: 'unchecked-value' };
const ENABLED = { name: 'X-Enabled', value: 'enabled-value' };
const DISABLED = { name: 'X-Disabled', value: 'disabled-value' };

const bulkLine = (name: string, value: string, commented = false) => `${commented ? '//' : ''}${name}:${value}`;

const FROM_TABLE = [
  bulkLine(CHECKED.name, CHECKED.value),
  bulkLine(UNCHECKED.name, UNCHECKED.value, true)
];

const ALL_LINES = [
  ...FROM_TABLE,
  bulkLine(ENABLED.name, ENABLED.value),
  bulkLine(DISABLED.name, DISABLED.value, true)
];

const headerBulk = (page: Page) => ({
  bulkEdit: () => page.getByRole('button', { name: 'Bulk Edit' }),
  keyValueEdit: () => page.getByRole('button', { name: 'Key/Value Edit' }),
  editor: () => page.getByRole('button', { name: 'Key/Value Edit' }).locator('xpath=../preceding-sibling::div').locator('.CodeMirror')
});

const readBulkEditor = (editor: Locator) => editor.evaluate((el: HTMLElement & { CodeMirror?: { getValue: () => string } }) => {
  if (!el.CodeMirror) {
    throw new Error('No CodeMirror in request headers bulk editor');
  }
  return el.CodeMirror.getValue();
});

const writeBulkEditor = (editor: Locator, value: string) => editor.evaluate((el: HTMLElement & { CodeMirror?: { setValue: (next: string) => void } }, next: string) => {
  if (!el.CodeMirror) {
    throw new Error('No CodeMirror in request headers bulk editor');
  }
  el.CodeMirror.setValue(next);
}, value);

const cellText = (row: Locator, column: 'name' | 'value') => row.getByTestId(`column-${column}`).locator('.CodeMirror-line');

// The test-details object only accepts tag and annotation. Timeout has to be set on the suite,
// or Electron setup is still cut off at the 30s project default.
test.describe.configure({ timeout: 120_000 });

test.afterEach(async ({ page }) => {
  if (!page) return;
  await closeAllCollections(page);
});

test('TC-592: Verify the Link from Key/Value to Bulk Edit View for Request Headers.', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const headers = buildRequestLocators(page).headers;
  const bulk = headerBulk(page);

  await test.step('Open an HTTP request on the Headers tab', async () => {
    await createCollection(page, 'bulk-edit-headers', await createTmpDir('bulk-edit-headers'));
    await createRequest(page, 'get-headers', 'bulk-edit-headers', { url: 'https://example.com' });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.table()).toBeVisible();
    await expect(headers.addRow().getByTestId('column-name')).toBeVisible();
    await expect(headers.addRow().getByTestId('column-value')).toBeVisible();
    await expect(bulk.bulkEdit()).toBeVisible();
    await expect(bulk.bulkEdit()).toBeEnabled();
  });

  await test.step('Add one checked header and one unchecked header', async () => {
    await fillRequestHeaderName(page, headers.addRow(), CHECKED.name);
    await fillRequestHeaderValue(page, headers.requestRow(CHECKED.name), CHECKED.value);
    await expect(headers.requestRow(CHECKED.name).getByTestId('column-checkbox')).toBeChecked();
    await expect(headers.requestRow(CHECKED.name).getByTestId('column-checkbox')).toBeEnabled();

    await fillRequestHeaderName(page, headers.addRow(), UNCHECKED.name);
    await fillRequestHeaderValue(page, headers.requestRow(UNCHECKED.name), UNCHECKED.value);
    const uncheckedBox = headers.requestRow(UNCHECKED.name).getByTestId('column-checkbox');
    await uncheckedBox.uncheck();

    await expect(cellText(headers.requestRow(CHECKED.name), 'name')).toHaveText(CHECKED.name);
    await expect(cellText(headers.requestRow(CHECKED.name), 'value')).toHaveText(CHECKED.value);
    await expect(headers.requestRow(CHECKED.name).getByTestId('column-checkbox')).toBeChecked();

    await expect(cellText(headers.requestRow(UNCHECKED.name), 'name')).toHaveText(UNCHECKED.name);
    await expect(cellText(headers.requestRow(UNCHECKED.name), 'value')).toHaveText(UNCHECKED.value);
    await expect(uncheckedBox).not.toBeChecked();
    await expect(uncheckedBox).toBeEnabled();
  });

  await test.step('Switch to Bulk Edit and confirm the unchecked header is commented', async () => {
    await bulk.bulkEdit().click();

    await expect(headers.table()).toBeHidden();
    await expect(bulk.keyValueEdit()).toBeVisible();
    await expect(bulk.keyValueEdit()).toBeEnabled();
    await expect(bulk.editor().locator('.CodeMirror-line')).toHaveText(FROM_TABLE);
  });

  await test.step('Add one enabled line and one commented line in Bulk Edit', async () => {
    const current = await readBulkEditor(bulk.editor());
    expect(current).toBe(FROM_TABLE.join('\n'));

    await writeBulkEditor(bulk.editor(), ALL_LINES.join('\n'));

    await expect(bulk.editor().locator('.CodeMirror-line')).toHaveText(ALL_LINES);
  });

  await test.step('Switch back to Key/Value view', async () => {
    await bulk.keyValueEdit().click();

    await expect(bulk.keyValueEdit()).toBeHidden();
    await expect(headers.table()).toBeVisible();
    await expect(bulk.bulkEdit()).toBeVisible();

    for (const header of [CHECKED, UNCHECKED, ENABLED, DISABLED]) {
      await expect(cellText(headers.requestRow(header.name), 'name')).toHaveText(header.name);
      await expect(cellText(headers.requestRow(header.name), 'value')).toHaveText(header.value);
    }
  });

  await test.step('Commented rows come back unchecked and still clickable', async () => {
    for (const header of [UNCHECKED, DISABLED]) {
      const checkbox = headers.requestRow(header.name).getByTestId('column-checkbox');
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toBeEnabled();
    }

    for (const header of [CHECKED, ENABLED]) {
      const checkbox = headers.requestRow(header.name).getByTestId('column-checkbox');
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
    }
  });
});
