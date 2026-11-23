import { Locator } from '../../playwright';

/**
 * Locators for the Bulk Edit / Key-Value toggle used by params and headers tables.
 * @param root - The pane that holds the table, e.g. the request pane
 */
export const buildBulkEditorLocators = (root: Locator) => ({
  bulkEditToggle: () => root.getByTestId('bulk-edit-toggle'),
  keyValueEditToggle: () => root.getByTestId('key-value-edit-toggle'),
  bulkEditor: () => root.getByTestId('bulk-edit-editor').locator('.CodeMirror'),
  bulkEditorLine: (text: string) => root.getByTestId('bulk-edit-editor').getByText(text, { exact: true })
});
