import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  sendRequest
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

/**
 * E2E test for File / Binary request body uploads.
 * Regression test for the bug where a file body with content-type containing
 * "json" was JSON-stringified during interpolation, so the server received the
 * Node ReadStream metadata (~342 bytes) instead of the file contents.
 *
 * Server-side endpoints:
 *   POST /api/file-binary/binary-upload-json           — application/json
 *   POST /api/file-binary/binary-upload-octet-stream   — application/octet-stream
 *
 * Both echo back { bytesReceived, sha256, looksLikeSerializedNodeStream, ... }
 * so we can assert the upload arrived byte-exact.
 */
test.describe.serial('File / Binary body upload', () => {
  const collectionName = 'binary-file-upload';
  const jsonRequestName = 'json-upload';
  const octetRequestName = 'octet-upload';
  const txtRequestName = 'txt-file-upload';
  const csvRequestName = 'csv-file-upload';
  const imgRequestName = 'image-file-upload';
  const pdfRequestName = 'pdf-file-upload';

  let tmpDir: string;
  let jsonFilePath: string;
  let octetFilePath: string;
  let jsonFileSha256: string;
  let octetFileSha256: string;
  let jsonFileSize: number;
  let octetFileSize: number;
  let txtFilePath: string;
  let txtFileSizeInBytes: number;
  let csvFilePath: string;
  let csvFileSizeInBytes: number;
  let imgFilePath: string;
  let imgFileSizeInBytes: number;
  let pdfFilePath: string;
  let pdfFileSizeInBytes: number;

  test.beforeAll(async ({ page, electronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    tmpDir = await createTmpDir('binary-file-upload');

    // The JSON file is intentionally larger than the 20 MiB streaming
    // threshold (STREAMING_FILE_SIZE_THRESHOLD in prepare-request.js) so the
    // body is sent as an fs.ReadStream — this is the exact code path that
    // produced the bug. Anything <= 20 MiB would go through the Buffer path,
    // which was never broken.
    const LARGE_JSON_BYTES = 80 * 1024 * 1024; // 25 MiB > 20 MiB threshold
    const jsonBuffer = Buffer.alloc(LARGE_JSON_BYTES, 'a');
    jsonFilePath = path.join(tmpDir, 'payload.json');
    await fs.promises.writeFile(jsonFilePath, jsonBuffer);
    jsonFileSize = LARGE_JSON_BYTES;
    jsonFileSha256 = crypto.createHash('sha256').update(jsonBuffer).digest('hex');

    const octetContent = 'plain octet-stream payload\n';
    octetFilePath = path.join(tmpDir, 'payload.bin');
    await fs.promises.writeFile(octetFilePath, octetContent);
    octetFileSize = Buffer.byteLength(octetContent);
    octetFileSha256 = crypto.createHash('sha256').update(octetContent).digest('hex');

    // Create a large text file and save it in the temporary directory (tmpDir)
    txtFileSizeInBytes = 3 * 1024 * 1024;
    const txtBuffer = Buffer.alloc(txtFileSizeInBytes, 'a');
    txtFilePath = path.join(tmpDir, 'large-txt-file.txt');
    await fs.promises.writeFile(txtFilePath, txtBuffer);

    // Create a large csv file and save it in the temporary directory (tmpDir)
    csvFileSizeInBytes = 1 * 1024 * 1024;
    csvFilePath = path.join(tmpDir, 'large-csv-file.csv');
    const header = 'id,name,email,status\n';
    const row = '1,Test User,user@example.com,active\n';
    const rowCount = Math.ceil((csvFileSizeInBytes - Buffer.byteLength(header)) / Buffer.byteLength(row));
    await fs.promises.writeFile(csvFilePath, header + row.repeat(rowCount), 'utf8');

    // Create a large png file and save it in the temporary directory (tmpDir)
    imgFileSizeInBytes = 10 * 1024 * 1024;
    const imgBuffer = Buffer.alloc(imgFileSizeInBytes, 'a');
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(imgBuffer);
    imgFilePath = path.join(tmpDir, 'large-image.png');
    await fs.promises.writeFile(imgFilePath, imgBuffer);

    // Create a large pdf file and save it in the temporary directory (tmpDir)
    pdfFileSizeInBytes = 5 * 1024 * 1024;
    const pdfBuffer = Buffer.alloc(pdfFileSizeInBytes, 'a');
    pdfBuffer.write('%PDF-1.4\n');
    pdfFilePath = path.join(tmpDir, 'large-file.pdf');
    await fs.promises.writeFile(pdfFilePath, pdfBuffer);

    // Stash and replace the native file picker dialog so FilePickerEditor's
    // Browse button resolves to a path of our choosing. The currentSelection
    // is updated per-test so each test picks the right file.
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
      (dialog as any).__currentSelection = '';
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [(dialog as any).__currentSelection]
      });
    });

    await test.step('Create collection and requests', async () => {
      await createCollection(page, collectionName, tmpDir);
      await createRequest(page, jsonRequestName, collectionName, {
        url: 'http://localhost:8081/api/file-binary/binary-upload-json',
        method: 'POST',
        inFolder: false
      });
      await createRequest(page, octetRequestName, collectionName, {
        url: 'http://localhost:8081/api/file-binary/binary-upload-octet-stream',
        method: 'POST',
        inFolder: false
      });
      await createRequest(page, txtRequestName, collectionName, {
        url: 'https://httpbin.org/post',
        method: 'POST',
        inFolder: false
      });
      await createRequest(page, csvRequestName, collectionName, {
        url: 'https://httpbin.org/post',
        method: 'POST',
        inFolder: false
      });
      await createRequest(page, imgRequestName, collectionName, {
        url: 'https://httpbin.org/post',
        method: 'POST',
        inFolder: false
      });
      await createRequest(page, pdfRequestName, collectionName, {
        url: 'https://httpbin.org/post',
        method: 'POST',
        inFolder: false
      });
    });
  });

  test.afterAll(async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      if ((dialog as any).__originalShowOpenDialog) {
        dialog.showOpenDialog = (dialog as any).__originalShowOpenDialog;
        delete (dialog as any).__originalShowOpenDialog;
        delete (dialog as any).__currentSelection;
      }
    });
    await closeAllCollections(page);
  });

  // Switches the body to File / Binary, adds a row, picks the file, and
  // (optionally) overrides the content-type. Bruno's `updateFile` reducer
  // auto-fills content-type from the file extension via mime.contentType
  // (.json → application/json; charset=utf-8, .bin → application/octet-stream),
  // so when we want a different value (e.g. plain "application/json") we
  // must select-all and replace — typing into the prefilled cell would
  // splice into it at the caret and produce a corrupted header.
  const configureFileBody = async (
    page: import('@playwright/test').Page,
    overrideContentType?: string
  ) => {
    await selectRequestPaneTab(page, 'Body');

    const locators = buildCommonLocators(page);
    await locators.request.bodyModeSelector().click();
    await page.locator('.dropdown-item').filter({ hasText: 'File / Binary' }).click();

    await test.step('Add file row and pick the file', async () => {
      await page.getByRole('button', { name: /Add File/i }).click();
      await page.locator('.file-picker-btn').first().click();
      await expect(page.locator('.file-picker-selected').first()).toBeVisible({ timeout: 5000 });
    });

    if (overrideContentType) {
      await test.step(`Override content-type to "${overrideContentType}"`, async () => {
        // Second column in the FileBody table is the content-type editor (SingleLineEditor / CodeMirror)
        const contentTypeCell = page.locator('table tbody tr').first().locator('td').nth(1);
        await contentTypeCell.locator('.CodeMirror').click();
        await page.keyboard.press(selectAllShortcut);
        await page.keyboard.press('Backspace');
        await page.keyboard.type(overrideContentType);
        // Commit the value and blur the editor so the new content-type is persisted
        await page.keyboard.press('Tab');
      });
    }
  };

  test('JSON content-type: file bytes are sent verbatim, not as serialized stream metadata', async ({
    page,
    electronApp
  }) => {
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, jsonFilePath);

    await openRequest(page, collectionName, jsonRequestName, { persist: true });
    // Override the auto-detected "application/json; charset=utf-8" with plain
    // "application/json" — that's the exact header the bug repro used.
    await configureFileBody(page, 'application/json');
    await sendRequest(page, 200, 30000);

    const locators = buildCommonLocators(page);
    const responseText = await locators.response.previewContainer().innerText();

    expect(responseText).toContain('"contentType": "application/json"');

    const jsonBytesReceivedMatch = responseText.match(/"bytesReceived":\s*(\d+)/);
    expect(jsonBytesReceivedMatch).not.toBeNull();
    expect(Number(jsonBytesReceivedMatch![1])).toBe(jsonFileSize);

    expect(responseText).toContain(`"sha256": "${jsonFileSha256}"`);
    expect(responseText).toContain('"looksLikeSerializedNodeStream": false');
    // Sanity check: the bug would have produced these stream-metadata fields
    expect(responseText).not.toContain('"_readableState"');
  });

  test('octet-stream content-type: file bytes are sent verbatim (control case)', async ({
    page,
    electronApp
  }) => {
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, octetFilePath);

    await openRequest(page, collectionName, octetRequestName, { persist: true });
    await configureFileBody(page);

    await sendRequest(page, 200, 30000);

    const locators = buildCommonLocators(page);
    const responseText = await locators.response.previewContainer().innerText();

    expect(responseText).toContain('application/octet-stream');

    const octetBytesReceivedMatch = responseText.match(/"bytesReceived":\s*(\d+)/);
    expect(octetBytesReceivedMatch).not.toBeNull();
    expect(Number(octetBytesReceivedMatch![1])).toBe(octetFileSize);

    expect(responseText).toContain(`"sha256": "${octetFileSha256}"`);
    expect(responseText).toContain('"looksLikeSerializedNodeStream": false');
  });

  test('TC-2230 - Verify successful execution with a large TXT file', { tag: '@sanity' }, async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, txtFilePath);

    await openRequest(page, collectionName, txtRequestName, { persist: true });
    await configureFileBody(page);
    await sendRequest(page, 200, 60000);

    const locators = buildCommonLocators(page);
    const responseSize = await locators.response.responseSize().innerText();
    const responsebytes = Math.round(parseFloat(responseSize) * 1024);
    expect(responsebytes).toBeGreaterThanOrEqual(txtFileSizeInBytes);
  });

  test('TC-2236 - Verify successful execution with a large CSV file', { tag: '@sanity' }, async ({ page, electronApp }) => {
    test.setTimeout(120_000);
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, csvFilePath);

    await openRequest(page, collectionName, csvRequestName, { persist: true });
    await configureFileBody(page);
    await sendRequest(page, 200, 60000);

    const locators = buildCommonLocators(page);
    const responseSize = await locators.response.responseSize().innerText();
    const responsebytes = Math.round(parseFloat(responseSize) * 1024);
    expect(responsebytes).toBeGreaterThanOrEqual(csvFileSizeInBytes);
  });

  test('TC-2232 - Verify successful execution with a large Image(.png) file', { tag: '@sanity' }, async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, imgFilePath);

    await openRequest(page, collectionName, imgRequestName, { persist: true });
    await configureFileBody(page);
    await sendRequest(page, 200, 30000);

    const locators = buildCommonLocators(page);
    const responseSize = await locators.response.responseSize().innerText();
    const responsebytes = Math.round(parseFloat(responseSize) * 1024);
    expect(responsebytes).toBeGreaterThanOrEqual(imgFileSizeInBytes);
  });

  test('TC-2231 - Verify successful execution with a large PDF file', { tag: '@sanity' }, async ({ page, electronApp }) => {
    await electronApp.evaluate(({ dialog }, filePath: string) => {
      (dialog as any).__currentSelection = filePath;
    }, pdfFilePath);

    await openRequest(page, collectionName, pdfRequestName, { persist: true });
    await configureFileBody(page);
    await sendRequest(page, 200, 30000);

    const locators = buildCommonLocators(page);
    const responseSize = await locators.response.responseSize().innerText();
    const responsebytes = Math.round(parseFloat(responseSize) * 1024);
    expect(responsebytes).toBeGreaterThanOrEqual(pdfFileSizeInBytes);
  });
});
