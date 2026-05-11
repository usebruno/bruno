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
import type { ElectronApplication, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Multipart Form - Multiple File Upload', () => {
  let tmpDir: string;
  let fileA: string;
  let fileB: string;
  let fileC: string;

  test.beforeAll(async ({ page, electronApp, createTmpDir }) => {
    tmpDir = await createTmpDir('multipart-multi-upload');
    fileA = path.join(tmpDir, 'alpha.txt');
    fileB = path.join(tmpDir, 'beta.txt');
    fileC = path.join(tmpDir, 'gamma.txt');
    await fs.promises.writeFile(fileA, 'a');
    await fs.promises.writeFile(fileB, 'b');
    await fs.promises.writeFile(fileC, 'c');

    // Maximize the window so the value column is wide enough to render chips
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.maximize();
    });

    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
      (global as any).__mockFilePaths = [];
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: (global as any).__mockFilePaths || []
      });
    });

    await createCollection(page, 'multipart-multi-upload', tmpDir);
    await createRequest(page, 'test-multi-upload', '', {
      url: 'https://testbench-sanity.usebruno.com/api/echo/json',
      method: 'POST',
      inFolder: false
    });
    await openCollection(page, 'multipart-multi-upload');
    await openRequest(page, 'multipart-multi-upload', 'test-multi-upload', { persist: true });
    await selectRequestPaneTab(page, 'Body');
    await buildCommonLocators(page).request.bodyModeSelector().click();
    await page.locator('.dropdown-item').filter({ hasText: 'Multipart Form' }).click();
  });

  test.afterAll(async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      if ((dialog as any).__originalShowOpenDialog) {
        dialog.showOpenDialog = (dialog as any).__originalShowOpenDialog;
        delete (dialog as any).__originalShowOpenDialog;
      }
    });
    await closeAllCollections(page);
  });

  // Reset the form to a single empty row before each test.
  test.beforeEach(async ({ page }) => {
    const table = buildCommonLocators(page).table('editable-table');
    await expect(table.container()).toBeVisible();

    let rowCount = await table.allRows().count();
    while (rowCount > 1) {
      await table.rowDeleteButton(rowCount - 2).click();
      await expect(table.allRows()).toHaveCount(rowCount - 1);
      rowCount = await table.allRows().count();
    }
    await saveRequest(page);
  });

  // Tell the mocked dialog what to return, then click the upload button on
  // the empty last row.
  const uploadFiles = async (page: Page, electronApp: ElectronApplication, files: string[]) => {
    await electronApp.evaluate((_, paths) => {
      (global as any).__mockFilePaths = paths;
    }, files);

    const table = buildCommonLocators(page).table('editable-table');
    await table.allRows().last().locator('.upload-btn').click();
  };

  test('uploading multiple files shows one chip per file', async ({ page, electronApp }) => {
    await uploadFiles(page, electronApp, [fileA, fileB, fileC]);

    const chips = page.locator('.file-chip');
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0).locator('.file-chip-name')).toHaveText('alpha.txt');
    await expect(chips.nth(1).locator('.file-chip-name')).toHaveText('beta.txt');
    await expect(chips.nth(2).locator('.file-chip-name')).toHaveText('gamma.txt');
  });

  test('each chip can be removed individually', async ({ page, electronApp }) => {
    await uploadFiles(page, electronApp, [fileA, fileB, fileC]);

    const chips = page.locator('.file-chip');
    await expect(chips).toHaveCount(3);

    await chips.filter({ hasText: 'beta.txt' }).locator('.file-chip-remove').click();

    await expect(chips).toHaveCount(2);
    await expect(chips.filter({ hasText: 'alpha.txt' })).toBeVisible();
    await expect(chips.filter({ hasText: 'gamma.txt' })).toBeVisible();
    await expect(chips.filter({ hasText: 'beta.txt' })).toHaveCount(0);
  });
});
