import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  closeGenerateCodeDialog,
  createCollection,
  createRequest,
  getGeneratedSnippet,
  openRequest,
  readEditorValue,
  saveRequest,
  selectRequestBodyMode,
  sendRequestAndWaitForResponse,
  switchToFileMode
} from '../../../pages';
import { selectMultipartFiles } from '../../../pages/request/multipart-form';

const REQUEST = 'file-upload';
const URL = 'http://localhost:8081/api/multipart/mixed-content-types';

type UploadedPart = { name: string; filename: string };

test.describe('Multipart Form - file keys in the response, generated code and file mode', () => {
  let filePaths: string[];

  test.beforeAll(async ({ createTmpDir }) => {
    const filesDir = await createTmpDir('multipart-file-keys');
    filePaths = [path.join(filesDir, 'first.txt'), path.join(filesDir, 'second.txt')];
    await fs.promises.writeFile(filePaths[0], 'first file\n');
    await fs.promises.writeFile(filePaths[1], 'second file\n');
  });

  test.afterEach(async ({ page }) => {
    await closeGenerateCodeDialog(page);
    await closeAllCollections(page);
  });

  const openMultipartRequest = async (
    page: Page,
    createTmpDir: (tag?: string) => Promise<string>,
    collectionName: string
  ) => {
    await createCollection(page, collectionName, await createTmpDir(collectionName), 'bru');
    await createRequest(page, REQUEST, collectionName, { url: URL, method: 'POST' });
    await openRequest(page, collectionName, REQUEST, { persist: true });

    await test.step('Change the body type to Multipart Form', async () => {
      await selectRequestBodyMode(page, 'Multipart Form');
      await expect(buildCommonLocators(page).table('multipart-form-table').container()).toBeVisible();
    });
  };

  const saveSendAndReadParts = async (page: Page): Promise<[string, string][]> => {
    await saveRequest(page);
    await sendRequestAndWaitForResponse(page, 200);
    const responseEditor = buildCommonLocators(page).response.previewContainerCodeMirror();
    await expect.poll(() => readEditorValue(responseEditor)).not.toBe('');
    const parts: UploadedPart[] = JSON.parse(await readEditorValue(responseEditor));
    return parts.map((part) => [part.name, part.filename]);
  };

  const expectFileModeToContain = async (page: Page, expected: string) => {
    await switchToFileMode(page);
    await expect.poll(() => readEditorValue(buildCommonLocators(page).fileMode.editor())).toContain(expected);
  };

  test('TC-3243: multiple files on the same multipart key are sent, generated as code and stored in the request file', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const field = 'file1';
    await openMultipartRequest(page, createTmpDir, 'multipart-same-key-multi-file');

    await test.step('Upload two files on one key and send the request', async () => {
      await selectMultipartFiles(page, electronApp, filePaths, field);

      expect(await saveSendAndReadParts(page)).toEqual(filePaths.map((filePath) => [field, path.basename(filePath)]));
    });

    await test.step('Generated curl carries both files on the one key', async () => {
      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('curl --request POST');
      expect(snippet).toContain(`--url ${URL}`);
      expect(snippet).toContain(`--header 'Content-Type: multipart/form-data'`);
      expect(snippet).toContain(`--form '${field}=@${filePaths.join(',')}'`);
      await closeGenerateCodeDialog(page);
    });

    await test.step('File mode stores both paths on the one key', async () => {
      await expectFileModeToContain(
        page,
        `body:multipart-form {\n  ${field}: @file(${filePaths.join('|')}) @contentType(multipart/mixed)\n}`
      );
    });
  });

  test('TC-3246: files on multiple multipart keys are sent, generated as code and stored in the request file', { tag: '@sanity' }, async ({ page, electronApp, createTmpDir }) => {
    const fields = ['file1', 'file2'];
    await openMultipartRequest(page, createTmpDir, 'multipart-multi-key-files');

    await test.step('Upload one file on each key and send the request', async () => {
      for (const [rowIndex, field] of fields.entries()) {
        await selectMultipartFiles(page, electronApp, [filePaths[rowIndex]], field, rowIndex);
      }

      expect(await saveSendAndReadParts(page)).toEqual(
        fields.map((field, index) => [field, path.basename(filePaths[index])])
      );
    });

    await test.step('Generated curl carries one form entry per key', async () => {
      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('curl --request POST');
      expect(snippet).toContain(`--url ${URL}`);
      expect(snippet).toContain(`--header 'Content-Type: multipart/form-data'`);
      // curl only quotes a form entry when its path needs shell escaping, so strip the quotes before comparing.
      const formEntries = snippet.replaceAll(`'`, '');
      for (const [index, field] of fields.entries()) {
        expect(formEntries).toContain(`--form ${field}=@${filePaths[index]}`);
      }
      await closeGenerateCodeDialog(page);
    });

    await test.step('File mode stores one file entry per key', async () => {
      const entries = fields.map(
        (field, index) => `  ${field}: @file(${filePaths[index]}) @contentType(text/plain; charset=utf-8)`
      );
      await expectFileModeToContain(page, `body:multipart-form {\n${entries.join('\n')}\n}`);
    });
  });
});
