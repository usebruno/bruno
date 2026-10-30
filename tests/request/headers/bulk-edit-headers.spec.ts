import { expect, test } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, selectRequestPaneTab } from '../../utils/page';
import { appendRequestHeaderBulkLines, buildRequestLocators, fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

const checked = { name: 'X-Checked', value: 'checked-value' };
const unchecked = { name: 'X-Unchecked', value: 'unchecked-value' };
const enabled = { name: 'X-Enabled', value: 'enabled-value' };
const disabled = { name: 'X-Disabled', value: 'disabled-value' };

const bulkLine = (name: string, value: string, commented = false) => `${commented ? '//' : ''}${name}:${value}`;

// CodeMirror's width measure is part of the editor text, so match the lines in order
// rather than the whole editor string.
const linesInOrder = (lines: string[]) => new RegExp(
  lines.map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*')
);

const fromTable = [
  bulkLine(checked.name, checked.value),
  bulkLine(unchecked.name, unchecked.value, true)
];

const allLines = [
  ...fromTable,
  bulkLine(enabled.name, enabled.value),
  bulkLine(disabled.name, disabled.value, true)
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
    await fillRequestHeaderName(page, headers.addRow(), checked.name);
    await fillRequestHeaderValue(page, headers.requestRow(checked.name), checked.value);
    await expect(headers.checkbox(headers.requestRow(checked.name))).toBeChecked();
    await expect(headers.checkbox(headers.requestRow(checked.name))).toBeEnabled();

    await fillRequestHeaderName(page, headers.addRow(), unchecked.name);
    await fillRequestHeaderValue(page, headers.requestRow(unchecked.name), unchecked.value);
    const uncheckedBox = headers.checkbox(headers.requestRow(unchecked.name));
    await uncheckedBox.uncheck();

    await expect(headers.cellLine(headers.requestRow(checked.name), 'name')).toContainText(checked.name);
    await expect(headers.cellLine(headers.requestRow(checked.name), 'value')).toContainText(checked.value);
    await expect(headers.checkbox(headers.requestRow(checked.name))).toBeChecked();

    await expect(headers.cellLine(headers.requestRow(unchecked.name), 'name')).toContainText(unchecked.name);
    await expect(headers.cellLine(headers.requestRow(unchecked.name), 'value')).toContainText(unchecked.value);
    await expect(uncheckedBox).not.toBeChecked();
    await expect(uncheckedBox).toBeEnabled();
  });

  await test.step('Switch to Bulk Edit and confirm the unchecked header is commented', async () => {
    await headers.bulkEdit().click();

    await expect(headers.table()).toBeHidden();
    await expect(headers.keyValueEdit()).toBeVisible();
    await expect(headers.keyValueEdit()).toBeEnabled();
    await expect(headers.bulkEditor()).toHaveText(linesInOrder(fromTable));
  });

  await test.step('Add one enabled line and one commented line in Bulk Edit', async () => {
    await appendRequestHeaderBulkLines(page, [
      bulkLine(enabled.name, enabled.value),
      bulkLine(disabled.name, disabled.value, true)
    ]);

    await expect(headers.bulkEditor()).toHaveText(linesInOrder(allLines));
  });

  await test.step('Switch back to Key/Value view', async () => {
    await headers.keyValueEdit().click();

    await expect(headers.keyValueEdit()).toBeHidden();
    await expect(headers.table()).toBeVisible();
    await expect(headers.bulkEdit()).toBeVisible();

    for (const header of [checked, unchecked, enabled, disabled]) {
      await expect(headers.cellLine(headers.requestRow(header.name), 'name')).toContainText(header.name);
      await expect(headers.cellLine(headers.requestRow(header.name), 'value')).toContainText(header.value);
    }
  });

  await test.step('Commented rows come back unchecked and still clickable', async () => {
    for (const header of [unchecked, disabled]) {
      const checkbox = headers.checkbox(headers.requestRow(header.name));
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toBeEnabled();
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }

    for (const header of [checked, enabled]) {
      const checkbox = headers.checkbox(headers.requestRow(header.name));
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
    }
  });
});
