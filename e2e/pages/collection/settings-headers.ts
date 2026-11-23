import { test, Locator, Page } from '../../playwright';
import { buildCodeMirrorLocators } from '../shared-ui/code-editor';
import { buildPaneTabsLocators } from '../shared-ui/pane-tabs';
import { buildTableLocator } from '../shared-ui/table';
import { buildCollectionSettingsPanelLocators, openCollectionSettings, selectCollectionPaneTab } from './settings';

/**
 * Locators for the collection settings Headers tab.
 */
export const buildCollectionSettingsHeadersLocators = (page: Page) => {
  const content = buildPaneTabsLocators(page).collectionSettingsContent;
  const headersTable = buildTableLocator(page)('collection-headers');
  const codeMirror = buildCodeMirrorLocators(page);
  const columnHeader = (name: string) => headersTable.container().locator('thead').getByText(name, { exact: true });
  const nameCell = (row: Locator) => row.getByTestId('column-name');
  const valueCell = (row: Locator) => row.getByTestId('column-value');

  return {
    table: headersTable.container,
    rows: headersTable.allRows,
    rowByName: headersTable.rowByName,
    nameColumnHeader: () => columnHeader('Name'),
    valueColumnHeader: () => columnHeader('Value'),
    nameCell,
    valueCell,
    nameEditor: (row: Locator) => codeMirror.within(nameCell(row)),
    valueEditor: (row: Locator) => codeMirror.within(valueCell(row)),
    bulkEditToggle: buildCollectionSettingsPanelLocators(page).headersBulkEditToggle,
    keyValueEditToggle: () => content().getByTestId('key-value-edit-toggle'),
    bulkEditor: () => codeMirror.within(content()),
    saveButton: () => content().getByRole('button', { name: 'Save', exact: true })
  };
};

/**
 * Open a collection's settings and switch to its Headers tab.
 * @param page - The page object
 * @param collectionName - The name of the collection
 */
export const openCollectionHeadersTab = async (page: Page, collectionName: string) => {
  await test.step(`Open the Headers tab of "${collectionName}"`, async () => {
    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'headers');
  });
};

/**
 * Type into a header name or value editor and pick an entry from the suggestion list.
 * @param page - The page object
 * @param editor - The cell editor, from `nameEditor(row)` or `valueEditor(row)`
 * @param typed - The text to type so the suggestions open
 * @param hintText - The suggestion to pick
 */
export const pickHeaderHint = async (page: Page, editor: Locator, typed: string, hintText: string) => {
  await test.step(`Pick "${hintText}" from the suggestions`, async () => {
    await editor.click();
    await page.keyboard.type(typed);
    const hint = buildCodeMirrorLocators(page).hint(hintText);
    await hint.waitFor({ state: 'visible' });
    await hint.click();
  });
};
