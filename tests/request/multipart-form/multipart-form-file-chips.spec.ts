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
    await table.allRows().last().getByTestId('multipart-file-upload').click();
  };

  // Reads all file names currently associated with the row, regardless of
  // whether they render as inline chips, in a `+N more` overflow dropdown, or
  // as a collapsed `N files` summary. The CI Linux runner has a small display,
  // so the value column often collapses into one of the overflow modes.
  const readFileNames = async (page: Page): Promise<string[]> => {
    const inlineChips = page.getByTestId('multipart-file-chip');
    const summary = page.getByTestId('multipart-file-summary');
    const more = page.getByTestId('multipart-file-more');

    const inlineNames = await inlineChips.allTextContents();
    const overflowTrigger = (await summary.count()) > 0 ? summary : (await more.count()) > 0 ? more : null;

    if (!overflowTrigger) {
      return inlineNames;
    }

    await overflowTrigger.click();
    const overflowRows = page.getByTestId('multipart-file-overflow-row');
    await expect(overflowRows.first()).toBeVisible();
    const overflowNames = await overflowRows.allTextContents();
    // Close the popover by clicking the trigger again (Tippy click-toggle).
    await overflowTrigger.click();
    await expect(overflowRows.first()).toBeHidden();

    // In summary mode all files are in the dropdown; in `+N more` mode the
    // inline chips plus the dropdown rows together cover the full list.
    return (await summary.count()) > 0 ? overflowNames : [...inlineNames, ...overflowNames];
  };

  // Removes a single file by name, handling inline-chip and overflow-row paths.
  const removeFileByName = async (page: Page, fileName: string) => {
    const inlineChip = page.getByTestId('multipart-file-chip').filter({ hasText: fileName });
    if ((await inlineChip.count()) > 0) {
      await inlineChip.getByTestId('multipart-file-chip-remove').click();
      await expect(inlineChip).toHaveCount(0);
      return;
    }

    const summary = page.getByTestId('multipart-file-summary');
    const more = page.getByTestId('multipart-file-more');
    const trigger = (await summary.count()) > 0 ? summary : more;
    await trigger.click();

    const row = page.getByTestId('multipart-file-overflow-row').filter({ hasText: fileName });
    await expect(row).toBeVisible();
    await row.getByTestId('multipart-file-overflow-remove').click();
    await expect(row).toHaveCount(0);

    // Close the popover if it's still open (it may have auto-closed when its
    // last row disappeared).
    if ((await trigger.count()) > 0 && (await page.getByTestId('multipart-file-overflow-row').first().isVisible().catch(() => false))) {
      await trigger.click();
    }
  };

  test('uploading multiple files registers one entry per file', async ({ page, electronApp }) => {
    await uploadFiles(page, electronApp, [fileA, fileB, fileC]);

    const names = await readFileNames(page);
    expect(names).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt']);
  });

  test('each file can be removed individually', async ({ page, electronApp }) => {
    await uploadFiles(page, electronApp, [fileA, fileB, fileC]);

    await removeFileByName(page, 'beta.txt');

    const names = await readFileNames(page);
    expect(names).toEqual(['alpha.txt', 'gamma.txt']);
  });
});
