import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import type { RequestListener } from 'http';
import { buildCommonLocators, dismissModalIfOpen } from '../../../pages';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import {
  buildImportPageLocators,
  dropImportFiles,
  loadImportText,
  selectImportFiles
} from '../../../pages/open-collection-modal/import-page';
import { startLocalServer } from '../../../servers';
import { importFixturePath, writeZip } from './helpers';

const BRUNO_COLLECTION = { 'bruno.json': JSON.stringify({ version: '1', name: 'Zipped Collection', type: 'collection' }) };

const fileErrors: { title: string; files: (tmpDir: string) => string[]; message: string }[] = [
  {
    title: 'a JSON file in no collection format',
    files: () => [importFixturePath('unsupported.json')],
    message: 'Unsupported collection format'
  },
  {
    title: 'a file that is not valid JSON',
    files: () => [importFixturePath('broken.json')],
    message: 'Failed to parse the file – ensure it is valid JSON or YAML'
  },
  {
    title: 'a JSON file that holds null',
    files: () => [importFixturePath('null.json')],
    message: 'Failed to parse file content'
  },
  {
    title: 'several files with no collection among them',
    files: () => [importFixturePath('unsupported.json'), importFixturePath('broken.json')],
    message: 'No valid collections found in the selected files'
  },
  {
    title: 'a ZIP together with a JSON file',
    files: (tmpDir) => [writeZip(path.join(tmpDir, 'collection.zip'), BRUNO_COLLECTION), importFixturePath('sample-postman.json')],
    message: 'Cannot mix ZIP files with other file types. Please select either a single ZIP file OR collection files (JSON/YAML)'
  },
  {
    title: 'two ZIP files',
    files: (tmpDir) => [
      writeZip(path.join(tmpDir, 'first.zip'), BRUNO_COLLECTION),
      writeZip(path.join(tmpDir, 'second.zip'), BRUNO_COLLECTION)
    ],
    message: 'Multiple ZIP files selected. Please select only one ZIP file at a time for import.'
  },
  {
    title: 'a ZIP without a Bruno collection',
    files: (tmpDir) => [writeZip(path.join(tmpDir, 'readme.zip'), { 'readme.txt': 'Not a collection' })],
    message: 'The ZIP file is not a valid Bruno collection'
  }
];

const textErrors: { title: string; text: (serverUrl: string) => string; message: string }[] = [
  {
    title: 'a URL that cannot be parsed',
    text: () => 'http://',
    message: 'Please enter a valid URL'
  },
  {
    title: 'a URL that answers 404',
    text: (serverUrl) => `${serverUrl}/missing.json`,
    message: 'URL import failed. Please check the URL and try again.'
  },
  {
    title: 'a URL whose JSON is in no collection format',
    text: (serverUrl) => `${serverUrl}/unsupported.json`,
    message: 'Unsupported collection format'
  },
  {
    title: 'text that is neither JSON nor YAML',
    text: () => 'just some words',
    message: 'Could not parse the text as JSON or YAML'
  },
  {
    title: 'JSON text in no collection format',
    text: () => '{"hello":"world"}',
    message: 'Unsupported collection format'
  }
];

const unsupportedCollection = fs.readFileSync(importFixturePath('unsupported.json'), 'utf8');

const serveErrorResponses: RequestListener = (request, response) => {
  if (request.url === '/unsupported.json') {
    response.end(unsupportedCollection);
    return;
  }
  response.writeHead(404);
  response.end();
};

test.describe('Open collection modal: import errors', () => {
  let server: Awaited<ReturnType<typeof startLocalServer>>;

  test.beforeAll(async () => {
    server = await startLocalServer(serveErrorResponses);
  });

  test.afterAll(() => {
    server.close();
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissModalIfOpen(page);
    await closeOpenCollectionModal(page);
  });

  for (const { title, files, message } of fileErrors) {
    test(`selecting ${title} shows an error and stays on Import`, async ({ pageWithUserData: page, createTmpDir }) => {
      const { import: importLocators, toast } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const errorToast = toast.byMessage(message);

      await test.step('Select the files on the Import page', async () => {
        await expect(errorToast).toHaveCount(0);
        await selectImportFiles(page, files(await createTmpDir('import-errors')));
      });

      await test.step(`Verify "${message}" and that no import modal opens`, async () => {
        await expect(errorToast).toBeVisible();
        await expect(openCollectionModal.pageView('import')).toBeVisible();
        await expect(importLocators.locationModal()).toBeHidden();
        await expect(importLocators.bulkModal()).toBeHidden();
      });
    });
  }

  for (const { title, text, message } of textErrors) {
    test(`loading ${title} shows an error and keeps the text`, async ({ pageWithUserData: page }) => {
      const { import: importLocators, toast } = buildCommonLocators(page);
      const openCollectionModal = buildOpenCollectionModalLocators(page);
      const importPage = buildImportPageLocators(page);
      const errorToast = toast.byMessage(message);
      const value = text(server.url);

      await test.step('Load the text on the Import page', async () => {
        await expect(errorToast).toHaveCount(0);
        await loadImportText(page, value);
      });

      await test.step(`Verify "${message}" and that the Import page keeps the text`, async () => {
        await expect(errorToast).toBeVisible();
        await expect(openCollectionModal.pageView('import')).toBeVisible();
        await expect(importPage.textInput()).toHaveValue(value);
        await expect(importLocators.locationModal()).toBeHidden();
      });
    });
  }

  test('dropping a file that is not valid JSON on Choose folder switches to Import and shows an error', async ({ pageWithUserData: page }) => {
    const { import: importLocators, toast } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const errorToast = toast.byMessage('Failed to parse the file – ensure it is valid JSON or YAML');

    await test.step('Show Choose folder in the Open collection modal', async () => {
      await showOpenCollectionModal(page, 'choose-folder');
    });

    await test.step('Drop a file that is not valid JSON on the modal', async () => {
      await expect(errorToast).toHaveCount(0);
      await dropImportFiles(page, [importFixturePath('broken.json')]);
    });

    await test.step('Verify the error is shown on the Import page', async () => {
      await expect(errorToast).toBeVisible();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });
});
