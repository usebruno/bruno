import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openCollection,
  openRequest,
  saveRequest,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import * as fs from 'fs';
import * as path from 'path';

test.describe.serial('Multipart Form - Multi-File Selection', () => {
  let tmpDir: string;
  let testFile1Path: string;
  let testFile2Path: string;
  let testFile3Path: string;

  test.afterEach(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      if ((dialog as any).__originalShowOpenDialog) {
        dialog.showOpenDialog = (dialog as any).__originalShowOpenDialog;
        delete (dialog as any).__originalShowOpenDialog;
      }
    });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test.beforeAll(async ({ page, electronApp, createTmpDir }) => {
    tmpDir = await createTmpDir('multipart-multi-file-select');

    testFile1Path = path.join(tmpDir, 'file1.txt');
    testFile2Path = path.join(tmpDir, 'file2.txt');
    testFile3Path = path.join(tmpDir, 'file3.pdf');

    await fs.promises.writeFile(testFile1Path, '1');
    await fs.promises.writeFile(testFile2Path, '2');
    await fs.promises.writeFile(testFile3Path, '3');

    await electronApp.evaluate(({ dialog }, filePaths: string[]) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths
      });
    }, [testFile1Path, testFile2Path, testFile3Path]);

    await test.step('Create collection and request', async () => {
      await createCollection(page, 'multipart-multi-file', tmpDir);
      await createRequest(page, 'test-multi-file', 'multipart-multi-file', {
        url: 'https://testbench-sanity.usebruno.com/api/echo/json',
        method: 'POST',
        inFolder: false
      });
    });

    await test.step('Open request and set multipart', async () => {
      await openCollection(page, 'multipart-multi-file');
      await openRequest(page, 'multipart-multi-file', 'test-multi-file', { persist: true });

      await selectRequestPaneTab(page, 'Body');
      const locators = buildCommonLocators(page);
      await locators.request.bodyModeSelector().click();
      await page.locator('.dropdown-item').filter({ hasText: 'Multipart Form' }).click();
    });
  });

  test('should select multiple files', async ({ page }) => {
    const table = buildCommonLocators(page).table('editable-table');
    const row = table.allRows().first();

    await test.step('Enter key and upload', async () => {
      await row.locator('td').nth(1).locator('input').fill('attachments');
      await page.keyboard.press('Tab');

      const uploadBtn = row.locator('.upload-btn');
      await expect(uploadBtn).toBeVisible();
      await uploadBtn.click();
    });

    await test.step('Verify file count', async () => {
      const fileCell = row.locator('.file-value-cell');
      await expect(fileCell).toContainText('3 file(s)');
    });

    await saveRequest(page);
  });

  test('should show filename for single file', async ({ page, electronApp }) => {
    const table = buildCommonLocators(page).table('editable-table');
    const row = table.allRows().last();

    await electronApp.evaluate(({ dialog }, filePath: string) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [filePath]
      });
    }, testFile1Path);

    await test.step('Upload single file', async () => {
      await row.locator('td').nth(1).locator('input').fill('single');
      await page.keyboard.press('Tab');

      await row.locator('.upload-btn').click();
    });

    await test.step('Verify filename', async () => {
      const fileCell = row.locator('.file-value-cell');
      await expect(fileCell).toContainText('file1.txt');
    });

    await saveRequest(page);
  });

  test('should clear files', async ({ page }) => {
    const table = buildCommonLocators(page).table('editable-table');
    const row = table.allRows().first();

    await test.step('Clear files', async () => {
      const clearBtn = row.locator('.clear-file-btn');
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
    });

    await test.step('Verify cleared', async () => {
      await expect(row.locator('.upload-btn')).toBeVisible();
    });

    await saveRequest(page);
  });
});
