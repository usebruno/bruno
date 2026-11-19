import { test, expect, Page, ElectronApplication } from '../../playwright';
import { buildTableLocator } from '../shared-ui/table';
import { mockBrowseFiles } from './body';

/**
 * Locators for the multipart form table on the request Body tab.
 * Wide columns render one chip per file; a narrow column collapses them to an "N files" summary.
 */
export const buildMultipartFormLocators = (page: Page) => {
  const table = buildTableLocator(page)('multipart-form-table');

  return {
    uploadButton: (rowIndex: number) => table.row(rowIndex).getByTestId('multipart-file-upload'),
    // .first() keeps toBeVisible strict when several chips are on screen.
    selectedFiles: (rowIndex: number) => {
      const row = table.row(rowIndex);
      return row.getByTestId('multipart-file-chip').or(row.getByTestId('multipart-file-summary')).first();
    },
    fieldName: (rowIndex: number) => table.row(rowIndex).getByTestId('column-name').getByRole('textbox')
  };
};

/**
 * Choose files for the empty multipart row at `rowIndex` and name that field.
 */
export const selectMultipartFiles = async (
  page: Page,
  electronApp: ElectronApplication,
  filePaths: string[],
  fieldName: string,
  rowIndex = 0
) => {
  await test.step('Multi-select the files onto one form field', async () => {
    const form = buildMultipartFormLocators(page);
    await mockBrowseFiles(electronApp, filePaths);
    await form.uploadButton(rowIndex).click();
    await expect(form.selectedFiles(rowIndex)).toBeVisible();
    await form.fieldName(rowIndex).fill(fieldName);
  });
};
