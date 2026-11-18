import { expect, test } from '../../../playwright';
import { openRequest, selectRequestPaneTab } from '../../utils/page';
import { appendRequestHeadersToBulkEditor, buildRequestLocators, fillRequestHeaderName, fillRequestHeaderValue } from '../../utils/request';

const checked = { name: 'X-Checked', value: 'checked-value' };
const unchecked = { name: 'X-Unchecked', value: 'unchecked-value' };
const enabled = { name: 'X-Enabled', value: 'enabled-value' };
const disabled = { name: 'X-Disabled', value: 'disabled-value' };

const bulkLine = (name: string, value: string, commented = false) => `${commented ? '//' : ''}${name}:${value}`;

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

test('TC-592: Verify the Link from Key/Value to Bulk Edit View for Request Headers.', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
  const headers = buildRequestLocators(page).headers;

  // Definition
  await openRequest(page, 'bulk-edit-headers', 'get-headers');
  await selectRequestPaneTab(page, 'Headers');

  await test.step('Verify Headers key/value view is ready', async () => {
    await expect(headers.table()).toBeVisible();
    await expect(headers.nameCell(headers.addRow())).toBeVisible();
    await expect(headers.valueCell(headers.addRow())).toBeVisible();
    await expect(headers.bulkEditToggle()).toBeVisible();
    await expect(headers.bulkEditToggle()).toBeEnabled();
  });

  await test.step('Add a header', async () => {
    await fillRequestHeaderName(page, headers.addRow(), checked.name);
    await fillRequestHeaderValue(page, headers.requestRow(checked.name), checked.value);
  });

  await test.step('Verify checked header defaults to enabled', async () => {
    await expect(headers.cellText(checked.name, 'name')).toHaveText(checked.name);
    await expect(headers.cellText(checked.name, 'value')).toHaveText(checked.value);
    await expect(headers.checkbox(checked.name)).toBeChecked();
    await expect(headers.checkbox(checked.name)).toBeEnabled();
  });

  await test.step('Add a header with unchecked checkbox', async () => {
    await fillRequestHeaderName(page, headers.addRow(), unchecked.name);
    await fillRequestHeaderValue(page, headers.requestRow(unchecked.name), unchecked.value);
    await headers.checkbox(unchecked.name).uncheck();
  });

  await test.step('Verify the checkbox for the unchecked header is unchecked', async () => {
    await expect(headers.checkbox(unchecked.name)).not.toBeChecked();
    await expect(headers.checkbox(unchecked.name)).toBeEnabled();
  });

  await test.step('Switch to Bulk Edit', async () => {
    await headers.bulkEditToggle().click();
  });

  await test.step('Verify Bulk Edit shows unchecked header as commented', async () => {
    await expect(headers.table()).toBeHidden();
    await expect(headers.keyValueEditToggle()).toBeVisible();
    await expect(headers.keyValueEditToggle()).toBeEnabled();
    await expect(headers.bulkEditorLines()).toHaveText(fromTable);
  });

  await test.step('Add an enabled line and a commented line in Bulk Edit', async () => {
    await appendRequestHeadersToBulkEditor(page, [
      bulkLine(enabled.name, enabled.value),
      bulkLine(disabled.name, disabled.value, true)
    ]);
  });

  await test.step('Verify Bulk Edit shows all four lines', async () => {
    await expect(headers.bulkEditorLines()).toHaveText(allLines);
  });

  await test.step('Switch back to Key/Value view', async () => {
    await headers.keyValueEditToggle().click();
  });

  await test.step('Verify all headers are present in Key/Value view', async () => {
    await expect(headers.keyValueEditToggle()).toBeHidden();
    await expect(headers.bulkEditToggle()).toBeVisible();
    await expect(headers.table()).toBeVisible();

    for (const header of [checked, unchecked, enabled, disabled]) {
      await expect(headers.cellText(header.name, 'name')).toHaveText(header.name);
      await expect(headers.cellText(header.name, 'value')).toHaveText(header.value);
    }
  });

  await test.step('Verify commented headers are unchecked and enabled headers stay checked', async () => {
    for (const header of [unchecked, disabled]) {
      const checkbox = headers.checkbox(header.name);
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).toBeEnabled();
    }

    for (const header of [checked, enabled]) {
      const checkbox = headers.checkbox(header.name);
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
    }
  });

  await test.step('Enable previously commented headers', async () => {
    for (const header of [unchecked, disabled]) {
      await headers.checkbox(header.name).click();
    }
  });

  await test.step('Verify previously commented headers are now checked', async () => {
    for (const header of [unchecked, disabled]) {
      await expect(headers.checkbox(header.name)).toBeChecked();
    }
  });
});
