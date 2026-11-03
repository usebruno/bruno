import { Locator, Page } from '../../../../playwright';

// Locators for the collection settings Headers tab.
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
