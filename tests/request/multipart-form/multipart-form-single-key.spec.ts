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
import { collectionName, multipartUpload, singleKeyFiles, writeUploadFiles } from './fixtures/upload-files';

test(
  'TC-3243: sends multiple files under one multipart key and shows both in cURL and File Mode',
  { tag: '@sanity' },
  async ({ pageWithUserData: page, baseURL, createTmpDir, reuseOrLaunchElectronApp }, testInfo) => {
    const requestName = `${basename(testInfo.file, '.spec.ts')}-${testInfo.retry}`;
    const { endpoint, method } = multipartUpload;
    const url = new URL(endpoint, baseURL).href;
    const [{ name: key, contentType }] = singleKeyFiles;
    const { sidebar, request, multipartForm, response, fileMode } = buildCommonLocators(page);

    const filePaths = await test.step('Create the files to upload', async () => {
      const uploads = await writeUploadFiles(await createTmpDir(requestName), singleKeyFiles);
      return uploads.map(({ filePath }) => filePath);
    });

    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });

    await test.step('Create and open the request', async () => {
      await createRequest(page, requestName, collectionName, { url, method });
      await sidebar.itemRowIn(collectionName, requestName, { rootOnly: true }).click();
    });
    await selectMultipartFormBody(page);
    await test.step('Attach files under one multipart key', async () => {
      await expect(multipartForm.table).toBeVisible();
      await selectMultipartFiles(page, app, filePaths, key);
    });
    await saveRequest(page);

    await test.step('Send the request and verify both files arrived under the same key', async () => {
      await request.sendButton().click();
      await expect(response.statusCode()).toHaveText('200 OK');
      await expect(async () => {
        const responseBody = await readEditorValue(response.previewContainerCodeMirror());
        expect(JSON.parse(responseBody)).toEqual(singleKeyFiles);
      }).toPass({ timeout: 5000 });
    });

    await test.step('Verify both files appear under one key in generated cURL', async () => {
      const curl = await getGeneratedSnippet(page);
      expect(curl).toContain(`curl --request ${method}`);
      expect(curl).toContain(`--url ${url}`);
      expect(curl).toMatch(/--header 'content-type: multipart\/form-data'/i);
      expect(readCurlFormFiles(curl)).toEqual(filePaths.map((filePath) => ({ name: key, filePaths: [filePath] })));
      await closeGenerateCodeDialog(page);
    });

    await test.step('Verify both files appear under one key in File Mode', async () => {
      await switchToFileMode(page);
      const entry = `${key}: @file(${filePaths.join('|')}) @contentType(${contentType})`;
      await expect.poll(async () => readMultipartEntries(await readEditorValue(fileMode.editor()))).toEqual([entry]);
    });
  }
);
