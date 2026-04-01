import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, openCollection, openRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Multipart Form - File Select Without Key', () => {
  let tmpDir: string;
  let testFilePath: string;

  test.afterAll(async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      if ((dialog as any).__originalShowOpenDialog) {
        dialog.showOpenDialog = (dialog as any).__originalShowOpenDialog;
        delete (dialog as any).__originalShowOpenDialog;
      }
    });
    await closeAllCollections(page);
  });

  test.beforeAll(async ({ page, electronApp, createTmpDir }) => {
    tmpDir = await createTmpDir('multipart-file-select');

    // Create a temp file that the mocked dialog will "select"
    testFilePath = path.join(tmpDir, 'test-file.txt');
    await fs.promises.writeFile(testFilePath, 'hello world');

    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath]
      });
    }, testFilePath);

    await test.step('Create collection and request', async () => {
      await createCollection(page, 'multipart-file-select', tmpDir);
      await createRequest(page, 'test-file-select', '', {
        url: 'https://testbench-sanity.usebruno.com/api/echo/json',
        method: 'POST',
        inFolder: false
      });
    });

    await test.step('Open the request', async () => {
      await openCollection(page, 'multipart-file-select');
      await openRequest(page, 'multipart-file-select', 'test-file-select', { persist: true });
    });

    await test.step('Switch body mode to Multipart Form', async () => {
      await selectRequestPaneTab(page, 'Body');
      const locators = buildCommonLocators(page);
      await locators.request.bodyModeSelector().click();
      await page.locator('.dropdown-item').filter({ hasText: 'Multipart Form' }).click();
    });
  });

  test('file select should work on empty row without a key', async ({ page }) => {
    const table = buildCommonLocators(page).table('editable-table');

    await test.step('Click upload on empty last row (no key entered)', async () => {
      const lastRow = table.allRows().last();
      const uploadBtn = lastRow.locator('.upload-btn');
      await expect(uploadBtn).toBeVisible();
      await uploadBtn.click();
    });

    await test.step('Verify the file name appears in the row', async () => {
      const fileCell = table.allRows().locator('.file-value-cell').first();
      await expect(fileCell).toBeVisible();
      await expect(fileCell).toContainText('test-file.txt');
    });
  });
});
