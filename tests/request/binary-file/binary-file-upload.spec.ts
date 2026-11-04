import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  openCollectionFromDialog,
  openRequest,
  sendRequest,
  setFileBody
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { writePayloadFile, type PayloadFile } from '../../utils/fixtures/payload-file';

/**
 * E2E test for File / Binary request body uploads.
 * Regression test for the bug where a file body with content-type containing
 * "json" was JSON-stringified during interpolation, so the server received the
 * Node ReadStream metadata (~342 bytes) instead of the file contents.
 *
 * Server-side endpoints:
 *   POST /api/file-binary/binary-upload-json           — application/json
 *   POST /api/file-binary/binary-upload-octet-stream   — application/octet-stream
 *   POST /api/file-binary/binary-upload-any            — any content-type
 *
 * All three echo back { bytesReceived, sha256, looksLikeSerializedNodeStream, ... }
 * so we can assert the upload arrived byte-exact.
 */
test.describe.serial('File / Binary body upload', () => {
  const collectionName = 'binary-file-upload';
  const jsonRequestName = 'json-upload';
  const octetRequestName = 'octet-upload';
  // Over the 20 MiB STREAMING_FILE_SIZE_THRESHOLD, so these upload as an fs.ReadStream.
  const LARGE_FILE_BYTES = 25 * 1024 * 1024;

  // contentType is what Bruno derives from the extension — the only on-the-wire difference between cases.
  const largeFileCases = [
    { id: 'TC-2230', label: 'TXT', requestName: 'txt-file-upload', fileName: 'large-txt-file.txt', contentType: 'text/plain' },
    { id: 'TC-2231', label: 'PDF', requestName: 'pdf-file-upload', fileName: 'large-file.pdf', contentType: 'application/pdf' },
    { id: 'TC-2232', label: 'Image(.png)', requestName: 'image-file-upload', fileName: 'large-image.png', contentType: 'image/png' },
    { id: 'TC-2236', label: 'CSV', requestName: 'csv-file-upload', fileName: 'large-csv-file.csv', contentType: 'text/csv' }
  ] as const;

  let tmpDir: string;
  let jsonFilePath: string;
  let octetFilePath: string;
  let jsonFileSha256: string;
  let octetFileSha256: string;
  let jsonFileSize: number;
  let octetFileSize: number;
  const largeFileFixtures: Record<string, PayloadFile> = {};

  test.beforeAll(async ({ page, electronApp, createTmpDir, collectionFixturePath }) => {
    tmpDir = await createTmpDir('binary-file-upload-payloads');

    // The JSON file is intentionally larger than the 20 MiB streaming
    // threshold (STREAMING_FILE_SIZE_THRESHOLD in prepare-request.js) so the
    // body is sent as an fs.ReadStream — this is the exact code path that
    // produced the bug. Anything <= 20 MiB would go through the Buffer path,
    // which was never broken.
    const LARGE_JSON_BYTES = 80 * 1024 * 1024;
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

    for (const largeFileCase of largeFileCases) {
      largeFileFixtures[largeFileCase.requestName] = await writePayloadFile({
        dir: tmpDir,
        fileName: largeFileCase.fileName,
        sizeInBytes: LARGE_FILE_BYTES
      });
    }

    // openCollectionFromDialog leaves its mock in place, and electronApp is worker-scoped.
    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
    });
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
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

  test('JSON content-type: file bytes are sent verbatim, not as serialized stream metadata', async ({
    page,
    electronApp
  }) => {
    await openRequest(page, collectionName, jsonRequestName, { persist: true });
    // Override the auto-detected "application/json; charset=utf-8" with plain
    // "application/json" — that's the exact header the bug repro used.
    await setFileBody(page, electronApp, jsonFilePath, 'application/json');
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
    await openRequest(page, collectionName, octetRequestName, { persist: true });
    await setFileBody(page, electronApp, octetFilePath);

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

  for (const largeFileCase of largeFileCases) {
    test(`${largeFileCase.id}: Verify successful execution with a large ${largeFileCase.label} file`, { tag: '@sanity' }, async ({
      page,
      electronApp
    }) => {
      const fixture = largeFileFixtures[largeFileCase.requestName];

      await openRequest(page, collectionName, largeFileCase.requestName, { persist: true });
      await setFileBody(page, electronApp, fixture.path);
      await sendRequest(page, 200, 30000);

      const locators = buildCommonLocators(page);
      const responseText = await locators.response.previewContainer().innerText();

      expect(responseText).toContain(largeFileCase.contentType);

      const bytesReceivedMatch = responseText.match(/"bytesReceived":\s*(\d+)/);
      expect(bytesReceivedMatch).not.toBeNull();
      expect(Number(bytesReceivedMatch![1])).toBe(fixture.sizeInBytes);

      expect(responseText).toContain(`"sha256": "${fixture.sha256}"`);
      expect(responseText).toContain('"transferEncoding": "chunked"');
    });
  }
});
