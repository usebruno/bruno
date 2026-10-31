import { Locator, Page } from '../..';

/**
 * Locators for an EditableTable (headers, params, vars, assertions…), by its data-testid.
 */
export const buildTableLocator = (page: Page) => (testId: string) => {
  const container = () => page.getByTestId(testId);
  const getBodyRow = (index?: number) => {
    const locator = container().locator('tbody tr');
    return index !== undefined ? locator.nth(index) : locator;
  };

  return {
    container,
    row: (index?: number) => getBodyRow(index),
    // EditableTable rows carry data-row-name derived from the key column.
    rowByName: (name: string) => container().locator(`tbody tr[data-row-name="${name}"]`),
    rowCell: (columnKey: string, rowIndex?: number) => {
      const row = getBodyRow(rowIndex);
      return row.getByTestId(`column-${columnKey}`);
    },
    rowCheckbox: (rowIndex: number) => getBodyRow(rowIndex).getByTestId('column-checkbox'),
    rowCheckboxByName: (name: string) =>
      container().locator(`tbody tr[data-row-name="${name}"]`).getByTestId('column-checkbox'),
    rowDeleteButton: (rowIndex: number) => getBodyRow(rowIndex).getByTestId('column-delete'),
    allRows: () => container().locator('tbody tr'),
    rowNameInput: (row: Locator) => row.locator('input[type="text"]').first(),
    rowValueEditor: (row: Locator) => row.getByTestId('column-value').locator('.CodeMirror').first()
  };
};
