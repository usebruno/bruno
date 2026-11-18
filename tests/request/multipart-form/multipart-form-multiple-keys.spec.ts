import { basename } from 'node:path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeGenerateCodeDialog,
  createRequest,
  getGeneratedSnippet,
  readCurlFormFiles,
  readEditorValue,
  readMultipartEntries,
  saveRequest,
  selectMultipartFormBody,
  selectMultipartFiles,
  switchToFileMode
} from '../../utils/page';
import { collectionName, multipartUpload, multipleKeyFiles, writeUploadFiles } from './fixtures/upload-files';

test(
  'TC-3246: sends files under multiple multipart keys and shows both in cURL and File Mode',
  { tag: '@sanity' },
  async ({ pageWithUserData: page, baseURL, createTmpDir, reuseOrLaunchElectronApp }, testInfo) => {
    const requestName = `${basename(testInfo.file, '.spec.ts')}-${testInfo.retry}`;
    const { endpoint, method } = multipartUpload;
    const url = new URL(endpoint, baseURL).href;
    const { sidebar, request, multipartForm, response, fileMode } = buildCommonLocators(page);

    const uploads = await test.step('Create the files to upload', async () =>
      writeUploadFiles(await createTmpDir(requestName), multipleKeyFiles)
    );

    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });

    await test.step('Create and open the request', async () => {
      await createRequest(page, requestName, collectionName, { url, method });
      await sidebar.itemRowIn(collectionName, requestName, { rootOnly: true }).click();
    });
    await selectMultipartFormBody(page);
    await test.step('Attach one file under each multipart key', async () => {
      await expect(multipartForm.table).toBeVisible();
      for (const [index, { name, filePath }] of uploads.entries()) {
        await selectMultipartFiles(page, app, [filePath], name, index);
      }
    });
    await saveRequest(page);

    await test.step('Send the request and verify each file arrived under its own key', async () => {
      await request.sendButton().click();
      await expect(response.statusCode()).toHaveText('200 OK');
      await expect(async () => {
        const responseBody = await readEditorValue(response.previewContainerCodeMirror());
        expect(JSON.parse(responseBody)).toEqual(multipleKeyFiles);
      }).toPass({ timeout: 5000 });
    });

    await test.step('Verify each file appears under its own key in generated cURL', async () => {
      const curl = await getGeneratedSnippet(page);
      expect(curl).toContain(`curl --request ${method}`);
      expect(curl).toContain(`--url ${url}`);
      expect(curl).toMatch(/--header 'content-type: multipart\/form-data'/i);
      expect(readCurlFormFiles(curl)).toEqual(uploads.map(({ name, filePath }) => ({ name, filePaths: [filePath] })));
      await closeGenerateCodeDialog(page);
    });

    await test.step('Verify each file appears under its own key in File Mode', async () => {
      await switchToFileMode(page);
      const entries = uploads.map(({ name, filePath, contentType }) => `${name}: @file(${filePath}) @contentType(${contentType})`);
      await expect.poll(async () => readMultipartEntries(await readEditorValue(fileMode.editor()))).toEqual(entries);
    });
  }
);
