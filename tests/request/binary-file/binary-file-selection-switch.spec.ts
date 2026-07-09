import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { test, expect, type Locator, type Page } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  mockBrowseFiles,
  sendRequest
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// Intentionally inline as these are specific for this test and not reusable
const selectRow = async (rows: Locator, index: number, otherIndex: number, label: string) => {
  await test.step(`Switch the Selected radio to the ${label} row`, async () => {
    const radio = rows.nth(index).locator('input[type="radio"]');
    await radio.click();
    await expect(radio).toBeChecked();
    await expect(rows.nth(otherIndex).locator('input[type="radio"]')).not.toBeChecked();
  });
};

const sendAndAssertSha256 = async (page: Page, locators: ReturnType<typeof buildCommonLocators>, expectedSha256: string, unexpectedSha256: string) => {
  await sendRequest(page, 200, 30000);
  const responseText = await locators.response.previewContainer().innerText();
  const sha256Match = responseText.match(/"sha256":\s*"([a-f0-9]+)"/);
  expect(sha256Match).not.toBeNull();
  expect(sha256Match![1]).toBe(expectedSha256);
  expect(sha256Match![1]).not.toBe(unexpectedSha256);
};

test.describe.serial('File / Binary body - switching selected file', () => {
  const collectionName = 'binary-file-selection-switch';
  const requestName = 'switch-selected-file';

  let tmpDir: string;
  let firstFilePath: string;
  let secondFilePath: string;
  let firstFileSha256: string;
  let secondFileSha256: string;

  test.beforeAll(async ({ page, createTmpDir }) => {
    tmpDir = await createTmpDir('binary-file-selection-switch');

    const firstContent = 'first file payload\n';
    firstFilePath = path.join(tmpDir, 'first.bin');
    await fs.promises.writeFile(firstFilePath, firstContent);
    firstFileSha256 = crypto.createHash('sha256').update(firstContent).digest('hex');

    const secondContent = 'second file payload - this one should be sent\n';
    secondFilePath = path.join(tmpDir, 'second.bin');
    await fs.promises.writeFile(secondFilePath, secondContent);
    secondFileSha256 = crypto.createHash('sha256').update(secondContent).digest('hex');

    await createCollection(page, collectionName, tmpDir);
    await createRequest(page, requestName, collectionName, {
      url: 'http://localhost:8081/api/file-binary/binary-upload-octet-stream',
      method: 'POST',
      inFolder: false
    });
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('sends the newly-selected row, not the previously selected one', async ({ page, electronApp }) => {
    await openRequest(page, collectionName, requestName, { persist: true });

    await selectRequestPaneTab(page, 'Body');
    const locators = buildCommonLocators(page);
    await locators.request.bodyModeSelector().click();
    await page.locator('.dropdown-item').filter({ hasText: 'File / Binary' }).click();

    await test.step('Add two file rows', async () => {
      await mockBrowseFiles(electronApp, [firstFilePath]);
      await page.getByRole('button', { name: /Add File/i }).click();
      await page.locator('.file-picker-btn').first().click();
      await expect(page.locator('.file-picker-selected')).toHaveCount(1, { timeout: 5000 });

      await mockBrowseFiles(electronApp, [secondFilePath]);
      await page.getByRole('button', { name: /Add File/i }).click();
      await page.locator('.file-picker-btn').first().click();
      await expect(page.locator('.file-picker-selected')).toHaveCount(2, { timeout: 5000 });
    });

    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(2);

    // The first row is selected by default (first file added).
    await selectRow(rows, 0, 1, 'first');
    await sendAndAssertSha256(page, locators, firstFileSha256, secondFileSha256);

    await selectRow(rows, 1, 0, 'second');
    await sendAndAssertSha256(page, locators, secondFileSha256, firstFileSha256);

    await selectRow(rows, 0, 1, 'first');
    await sendAndAssertSha256(page, locators, firstFileSha256, secondFileSha256);
  });
});
