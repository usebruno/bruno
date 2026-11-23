import { expect, Locator, Page, test } from '../../playwright';
import { buildCodeMirrorLocators } from '../shared-ui/code-editor';
import { openCollectionSettings, selectCollectionPaneTab } from './settings';

/**
 * Locators for the collection settings Headers tab.
 */
export const buildCollectionSettingsHeadersLocators = (page: Page) => {
  const content = () => page.getByTestId('collection-settings-content');
  const table = () => page.getByTestId('collection-headers');

  return {
    table,
    nameColumnHeader: () => table().locator('.column-name').getByText('Name', { exact: true }),
    valueColumnHeader: () => table().locator('.column-name').getByText('Value', { exact: true }),
    rows: () => table().locator('tbody tr'),
    rowByName: (name: string) => table().locator(`tbody tr[data-row-name="${name}"]`),
    nameCell: (row: Locator) => row.getByTestId('column-name'),
    valueCell: (row: Locator) => row.getByTestId('column-value'),
    nameEditor: (row: Locator) => row.getByTestId('column-name').locator('.CodeMirror'),
    valueEditor: (row: Locator) => row.getByTestId('column-value').locator('.CodeMirror'),
    bulkEditToggle: () => page.getByTestId('bulk-edit-toggle'),
    keyValueEditToggle: () => page.getByTestId('key-value-edit-toggle'),
    bulkEditor: () => content().locator('.CodeMirror').first(),
    saveButton: () => content().getByRole('button', { name: 'Save', exact: true })
  };
};

/**
 * Open a collection's settings on the Headers tab.
 */
export const openHeaders = async (page: Page, collectionName: string) => {
  await test.step(`Open Headers settings for "${collectionName}"`, async () => {
    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'headers');
  });
};

/**
 * Type into a header name/value editor and pick a CodeMirror autocomplete hint.
 */
export const typeAndPickHint = async (
  page: Page,
  editor: Locator,
  typed: string,
  hintText: string
) => {
  await test.step(`Type "${typed}" and pick hint "${hintText}"`, async () => {
    await editor.click();
    await page.keyboard.type(typed, { delay: 40 });

    const hint = buildCodeMirrorLocators(page).hint(hintText);
    await expect(hint).toBeVisible();
    await hint.click();
    await expect(editor).toContainText(hintText);
  });
};

/**
 * Type a header name and value into the empty add-row of the Headers table.
 */
export const fillCollectionHeaderRow = async (page: Page, name: string, value: string) => {
  await test.step(`Enter collection header "${name}: ${value}"`, async () => {
    const headers = buildCollectionSettingsHeadersLocators(page);
    const row = headers.rows().first();
    await headers.nameEditor(row).click();
    await page.keyboard.type(name);
    await headers.valueEditor(row).click();
    await page.keyboard.type(value);
  });
};
