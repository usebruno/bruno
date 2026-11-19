import { test, expect, Page, ElectronApplication } from '../../../../playwright';
import { buildCommonLocators } from '../locators';

/**
 * Locators for the multipart form table on the request Body tab.
 * Wide columns render one chip per file; a narrow column collapses them to an "N files" summary.
 */
export const buildMultipartFormLocators = (page: Page) => {
  const locators = buildCommonLocators(page);
  const table = locators.table('multipart-form-table');
  const file = (testId: string) => table.container().getByTestId(testId);

  return {
    uploadButton: () => table.allRows().last().getByTestId('multipart-file-upload'),
    // .first() keeps toBeVisible strict when several chips are on screen.
    selectedFiles: () => file('multipart-file-chip').or(file('multipart-file-summary')).first(),
    fieldName: (rowIndex: number) => table.row(rowIndex).getByTestId('column-name').getByRole('textbox')
  };
};

/**
 * Choose files for the last multipart row and name that field.
 * The spec must already stub `dialog.showOpenDialog` to return `(global).__mockFilePaths`.
 */
export const selectMultipartFiles = async (
  page: Page,
  electronApp: ElectronApplication,
  filePaths: string[],
  fieldName: string,
  rowIndex = 0
) => {
  await test.step('Multi-select the files onto one form field', async () => {
    await electronApp.evaluate((_, paths) => {
      (global as any).__mockFilePaths = paths;
    }, filePaths);

    const form = buildMultipartFormLocators(page);
    await form.uploadButton().click();
    await expect(form.selectedFiles()).toBeVisible();
    await form.fieldName(rowIndex).fill(fieldName);
  });
};
