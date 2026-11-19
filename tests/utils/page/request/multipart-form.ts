import { ElectronApplication, Page, test } from '../../../../playwright';
import { mockBrowseFiles } from '../actions';

export const buildMultipartFormLocators = (page: Page) => {
  const table = page.getByTestId('multipart-form-table');

  const row = (index: number) => {
    const container = table.getByTestId('multipart-form-row').nth(index);
    return {
      key: container.getByTestId('multipart-form-key'),
      upload: container.getByTestId('multipart-file-upload'),
      fileSelection: container.getByTestId('multipart-file-selection')
    };
  };

  return { table, row };
};

/** Attach files from outside the collection to a new multipart field. */
export const selectMultipartFiles = async (
  page: Page,
  electronApp: ElectronApplication,
  filePaths: string[],
  fieldName: string,
  rowIndex = 0
) => {
  await test.step(`Attach files to multipart field "${fieldName}"`, async () => {
    const row = buildMultipartFormLocators(page).row(rowIndex);
    await row.key.fill(fieldName);
    await mockBrowseFiles(electronApp, filePaths);
    await row.upload.click();

    const selection = row.fileSelection.and(page.locator(`[data-file-paths=${JSON.stringify(JSON.stringify(filePaths))}]`));
    await selection.waitFor({ state: 'attached' });
  });
};
