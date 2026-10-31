import { test, expect, Page, ElectronApplication } from '../..';
import * as path from 'path';
import { buildRequestLocators, selectRequestPaneTab } from './pane';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildCodeMirrorLocators } from '../shared-ui/code-editor';
import { buildTableLocator } from '../shared-ui/table';

const buildLocators = (page: Page) => ({
  request: buildRequestLocators(page),
  dropdown: buildDropdownLocators(page),
  codeMirror: buildCodeMirrorLocators(page),
  table: buildTableLocator(page)
});

export const selectRequestBodyMode = async (page: Page, mode: string) => {
  await test.step(`Select request body mode "${mode}"`, async () => {
    await selectRequestPaneTab(page, 'Body');
    const locators = buildLocators(page);
    await locators.request.bodyModeSelector().click();
    await locators.dropdown.item(mode).click();
  });
};

export const mockBrowseFiles = async (electronApp: ElectronApplication, filePaths: string[]) => {
  await electronApp.evaluate(({ dialog }, selectedPaths: string[]) => {
    const originalShowOpenDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = (async () => {
      dialog.showOpenDialog = originalShowOpenDialog;
      return {
        canceled: false,
        filePaths: selectedPaths
      };
    }) as typeof dialog.showOpenDialog;
  }, filePaths);
};

export const addMultipartFileToLastRow = async (page: Page, electronApp: ElectronApplication, filePath: string) => {
  await test.step(`Add multipart file "${path.basename(filePath)}"`, async () => {
    await mockBrowseFiles(electronApp, [filePath]);

    const table = buildLocators(page).table('multipart-form-table');
    // The last row is the empty "add" row. Capture its index now, because once
    // we set a file the table appends a new empty row — so `.last()` would jump
    // to that new row instead of staying on the one we just filled.
    let rowIndex = (await table.allRows().count()) - 1;
    const targetRow = table.allRows().nth(rowIndex);

    if (rowIndex < 0) {
      rowIndex = 0;
    }

    await expect(targetRow.getByTestId('multipart-file-upload')).toBeVisible();
    await targetRow.getByTestId('multipart-file-upload').click();
    const specificRow = table.allRows().nth(rowIndex);
    await expect(specificRow.locator('.file-value-cell')).toBeVisible({ timeout: 10000 });
    const inlineChip = specificRow.getByTestId('multipart-file-chip').filter({ hasText: path.basename(filePath) });
    const summary = specificRow.getByTestId('multipart-file-summary');
    await expect(inlineChip.or(summary)).toBeVisible();
  });
};

export const removeFirstMultipartFile = async (page: Page) => {
  await test.step('Remove first multipart file', async () => {
    const table = buildLocators(page).table('multipart-form-table');
    const firstRow = table.allRows().first();
    await expect(firstRow.locator('.file-value-cell')).toBeVisible();

    const inlineRemove = firstRow.getByTestId('multipart-file-chip-remove').first();
    const summary = firstRow.getByTestId('multipart-file-summary');

    if (await inlineRemove.count() > 0) {
      await inlineRemove.click();
    } else {
      await expect(summary).toBeVisible();
      await summary.click();
      const overflowRemove = page.getByTestId('multipart-file-overflow-remove').first();
      await expect(overflowRemove).toBeVisible();
      await overflowRemove.click();
    }
    await expect(firstRow.locator('.file-value-cell')).toHaveCount(0);
    await expect(firstRow.locator('.value-cell')).toBeVisible();
  });
};

/**
 * Read the content of the request's Body editor
 * @param page - The page object
 */
export const readRequestBody = async (page: Page): Promise<string> => {
  await selectRequestPaneTab(page, 'Body');
  const editorTestId = 'request-body-editor';
  return buildLocators(page)
    .codeMirror.byTestId(editorTestId)
    .evaluate((el: any, testId: string) => {
      const cm = el.CodeMirror;
      if (!cm) throw new Error(`CodeMirror instance not found for "${testId}"`);
      return cm.getValue();
    }, editorTestId);
};

export const setTextBody = async (page: Page, value: string) => {
  const { request } = buildLocators(page);
  await request.bodyModeSelector().click();
  await page.locator('.dropdown-item').filter({ hasText: 'Text' }).click();
  await request.bodyEditor().locator('.CodeMirror').first().click();
  await page.keyboard.type(value);
};
