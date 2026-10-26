import { expect, test } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../../utils/page';
import { appendRequestHeaderBulkLines, buildRequestLocators, fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

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

// The test-details object only accepts tag and annotation. Timeout has to be set on the suite,
// or Electron setup is still cut off at the 30s project default.
test.describe.configure({ timeout: 120_000 });

test.afterEach(async ({ page }) => {
  if (!page) return;
  await closeAllCollections(page);
});

test('TC-592: Verify the Link from Key/Value to Bulk Edit View for Request Headers.', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const headers = buildRequestLocators(page).headers;

  await test.step('Open an HTTP request on the Headers tab', async () => {
    await createCollection(page, 'bulk-edit-headers', await createTmpDir('bulk-edit-headers'));
    await createRequest(page, 'get-headers', 'bulk-edit-headers', { url: 'https://example.com' });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.table()).toBeVisible();
    await expect(headers.nameCell(headers.addRow())).toBeVisible();
    await expect(headers.valueCell(headers.addRow())).toBeVisible();
    await expect(headers.bulkEdit()).toBeVisible();
    await expect(headers.bulkEdit()).toBeEnabled();
  });

  await test.step('Add one checked header and one unchecked header', async () => {
    await fillRequestHeaderName(page, headers.addRow(), CHECKED.name);
    await fillRequestHeaderValue(page, headers.requestRow(CHECKED.name), CHECKED.value);
    await expect(headers.checkbox(headers.requestRow(CHECKED.name))).toBeChecked();
    await expect(headers.checkbox(headers.requestRow(CHECKED.name))).toBeEnabled();

    await fillRequestHeaderName(page, headers.addRow(), UNCHECKED.name);
    await fillRequestHeaderValue(page, headers.requestRow(UNCHECKED.name), UNCHECKED.value);
    const uncheckedBox = headers.checkbox(headers.requestRow(UNCHECKED.name));
    await uncheckedBox.uncheck();

    await expect(headers.cellLine(headers.requestRow(CHECKED.name), 'name')).toHaveText(CHECKED.name);
    await expect(headers.cellLine(headers.requestRow(CHECKED.name), 'value')).toHaveText(CHECKED.value);
    await expect(headers.checkbox(headers.requestRow(CHECKED.name))).toBeChecked();

    await expect(headers.cellLine(headers.requestRow(UNCHECKED.name), 'name')).toHaveText(UNCHECKED.name);
    await expect(headers.cellLine(headers.requestRow(UNCHECKED.name), 'value')).toHaveText(UNCHECKED.value);
    await expect(uncheckedBox).not.toBeChecked();
    await expect(uncheckedBox).toBeEnabled();
  });

  await test.step('Switch to Bulk Edit and confirm the unchecked header is commented', async () => {
    await headers.bulkEdit().click();

    await expect(headers.table()).toBeHidden();
    await expect(headers.keyValueEdit()).toBeVisible();
    await expect(headers.keyValueEdit()).toBeEnabled();
    await expect(headers.bulkEditorLines()).toHaveText(FROM_TABLE);
  });

  await test.step('Add one enabled line and one commented line in Bulk Edit', async () => {
    await appendRequestHeaderBulkLines(page, [
      bulkLine(ENABLED.name, ENABLED.value),
      bulkLine(DISABLED.name, DISABLED.value, true)
    ]);

    await expect(headers.bulkEditorLines()).toHaveText(ALL_LINES);
  });

  await test.step('Switch back to Key/Value view', async () => {
    await headers.keyValueEdit().click();

    await expect(headers.keyValueEdit()).toBeHidden();
    await expect(headers.table()).toBeVisible();
    await expect(headers.bulkEdit()).toBeVisible();

    for (const header of [CHECKED, UNCHECKED, ENABLED, DISABLED]) {
      await expect(headers.cellLine(headers.requestRow(header.name), 'name')).toHaveText(header.name);
      await expect(headers.cellLine(headers.requestRow(header.name), 'value')).toHaveText(header.value);
    }
  });

  await test.step('Commented rows come back unchecked and still clickable', async () => {
    for (const header of [UNCHECKED, DISABLED]) {
      const checkbox = headers.checkbox(headers.requestRow(header.name));
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toBeEnabled();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }

    for (const header of [CHECKED, ENABLED]) {
      const checkbox = headers.checkbox(headers.requestRow(header.name));
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
    }
  });
});
