import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeGenerateCodeDialog,
  createRequest,
  getGeneratedSnippet,
  readEditorValue,
  saveRequest,
  selectMultipartFiles,
  selectRequestBodyMode,
  sendRequestAndWaitForResponse,
  switchToFileMode
} from '../../utils/page';
import { collectionName, fileKeyCases, uploadRequest } from './fixtures/file-keys';

for (const { id, title, fields } of fileKeyCases) {
  test(`${id}: ${title} and shows them in cURL and File Mode`, { tag: '@sanity' }, async ({
    pageWithUserData: page,
    createTmpDir,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    const requestName = `multipart-${id}-${testInfo.retry}`;
    const directory = await createTmpDir(requestName);
    const { sidebar, multipartForm, response, fileMode } = buildCommonLocators(page);

    const uploads = await test.step('Prepare the upload files', async () =>
      Promise.all(fields.map(async ({ key, filenames, contentType }) => {
        const paths = await Promise.all(filenames.map(async (filename) => {
          const filePath = join(directory, filename);
          await writeFile(filePath, filename);
          return filePath;
        }));
        return { key, filenames, contentType, paths };
      }))
    );

    await createRequest(page, requestName, collectionName, uploadRequest);
    await sidebar.itemRowIn(collectionName, requestName).click();
    await selectRequestBodyMode(page, 'Multipart Form');

    await test.step('Attach the files, then send and verify the multipart request', async () => {
      await expect(multipartForm.table).toBeVisible();
      for (const [rowIndex, { key, paths }] of uploads.entries()) {
        await selectMultipartFiles(page, app, paths, key, rowIndex);
      }
      await saveRequest(page);
      await sendRequestAndWaitForResponse(page, uploadRequest.statusCode);

      const expectedParts = uploads.flatMap(({ key, filenames }) => filenames.map((filename) => ({ name: key, filename })));
      await expect(async () => {
        const body = await readEditorValue(response.previewContainerCodeMirror());
        const parts: { name: string; filename: string }[] = JSON.parse(body);
        expect(parts.map(({ name, filename }) => ({ name, filename }))).toEqual(expectedParts);
      }).toPass();
    });

    await test.step('Verify the generated cURL form arguments', async () => {
      const curl = await getGeneratedSnippet(page);
      expect(curl).toContain(`curl --request ${uploadRequest.method}`);
      expect(curl).toContain(`--url ${uploadRequest.url}`);
      expect(curl).toMatch(/--header 'content-type: multipart\/form-data'/i);

      const formArguments = Array.from(curl.matchAll(/^\s*--form (.+?)(?: \\)?\r?$/gm), ([, argument]) => argument);
      const expectedArguments = uploads.map(({ key, paths }) => {
        const argument = `${key}=@${paths.join(',')}`;
        return `'${argument.replace(/'/g, '\'\\\'\'')}'`;
      });
      expect(formArguments).toEqual(expectedArguments);
      await closeGenerateCodeDialog(page);
    });

    await test.step('Verify the saved file paths, keys and content types in File Mode', async () => {
      await switchToFileMode(page);
      const entries = uploads.map(({ key, paths, contentType }) => `${key}: @file(${paths.join('|')}) @contentType(${contentType})`);
      await expect.poll(async () => {
        const content = await readEditorValue(fileMode.editor());
        const block = content.match(/^body:multipart-form \{\r?\n([\s\S]*?)^\}\r?$/m)?.[1];
        return block?.trim().split(/\r?\n/).map((entry) => entry.trim());
      }).toEqual(entries);

      await fileMode.overflowMenu().click();
      await fileMode.fileModeMenuItem().click();
      await fileMode.editor().waitFor({ state: 'hidden' });
    });
  });
}
