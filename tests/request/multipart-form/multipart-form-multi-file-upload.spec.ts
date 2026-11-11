import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  openCollectionFromPath,
  openRequest,
  saveRequest,
  selectRequestPaneTab,
  sendRequestAndWaitForResponse,
  waitForCollectionMount
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import * as fs from 'fs';
import * as path from 'path';

type ExpectedFile = {
  filename: string;
  path: string;
};

const writeFixture = async (dir: string, filename: string, contents: Buffer): Promise<ExpectedFile> => {
  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, contents);
  return { filename, path: filePath };
};

test.describe('Multipart Form - mixed file multi-select upload', () => {
  let files: ExpectedFile[];

  test.beforeAll(async ({ page, electronApp, createTmpDir, collectionFixturePath }) => {
    const tmpDir = await createTmpDir('multipart-mixed-upload');
    const note = Buffer.from('a short note\n');
    const payload = Buffer.from(JSON.stringify({ ok: true, items: [1, 2, 3], message: 'mixed upload' }, null, 2));
    const report = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(20000, 0x20)]);
    const diagram = Buffer.alloc(4096, 0x89);
    diagram.write('PNG', 1);

    files = await Promise.all([
      writeFixture(tmpDir, 'note.txt', note),
      writeFixture(tmpDir, 'payload.json', payload),
      writeFixture(tmpDir, 'report.pdf', report),
      writeFixture(tmpDir, 'diagram.png', diagram)
    ]);

    await electronApp.evaluate(({ dialog }) => {
      (dialog as any).__originalShowOpenDialog = dialog.showOpenDialog;
    });

    await openCollectionFromPath(page, electronApp, collectionFixturePath!);
    await waitForCollectionMount(page, 'collection');
    await openRequest(page, 'collection', 'mixed-upload', { persist: true });
    await selectRequestPaneTab(page, 'Body');

    await electronApp.evaluate(({ dialog }) => {
      (global as any).__mockFilePaths = [];
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: (global as any).__mockFilePaths || []
      });
    });
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

  test('TC-2402: selecting files of different types and sizes together uploads them in one form-data POST', { tag: '@sanity' }, async ({ page, electronApp }) => {
    test.setTimeout(60_000);

    const locators = buildCommonLocators(page);

    await test.step('Multi-select the files onto one form field', async () => {
      await electronApp.evaluate((_, paths) => {
        (global as any).__mockFilePaths = paths;
      }, files.map((file) => file.path));

      const form = locators.multipartForm();
      await form.uploadButton().click();
      await expect(form.selectedFiles()).toBeVisible();
      await form.fieldName(0).fill('uploads');
    });
    await sendRequestAndWaitForResponse(page, 200, { timeout: 30000 });
    await test.step('confirm every file name available in the response', async () => {
      const responseText = await locators.response.previewContainer().innerText();
      for (const file of files) {
        expect(responseText).toContain(file.filename);
      }
    });
  });
});
