import { test, expect } from '../../../playwright';
import { once } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type { IncomingMessage, RequestListener, ServerResponse } from 'http';
import { buildCommonLocators, closeAllCollections, dismissModalIfOpen } from '../../../pages';
import {
  buildOpenCollectionModalLocators,
  closeOpenCollectionModal,
  showOpenCollectionModal
} from '../../../pages/open-collection-modal/shell';
import { buildImportPageLocators, loadImportText, pasteImportText } from '../../../pages/open-collection-modal/import-page';
import { startLocalServer } from '../../../servers';
import { importFixturePath } from './helpers';

const postmanCollection = fs.readFileSync(importFixturePath('sample-postman.json'), 'utf8');
const openApiSpec = fs.readFileSync(importFixturePath('sample-openapi.yaml'), 'utf8');

const servedFiles: Record<string, string> = {
  '/postman.json': postmanCollection,
  '/openapi.yaml': openApiSpec,
  '/plain': postmanCollection
};

const serveImportFiles: RequestListener = (request, response) => {
  if (request.url === '/slow.json') {
    return;
  }
  const body = servedFiles[request.url ?? ''];
  response.writeHead(body ? 200 : 404);
  response.end(body);
};

test.describe('Open collection modal: importing text and URLs', () => {
  let server: Awaited<ReturnType<typeof startLocalServer>>;

  test.beforeAll(async () => {
    server = await startLocalServer(serveImportFiles);
  });

  test.afterAll(() => {
    server.close();
  });

  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissModalIfOpen(page);
    await closeOpenCollectionModal(page);
    await closeAllCollections(page);
  });

  test('a JSON URL loads on Enter and is imported', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importPage = buildImportPageLocators(page);
    const collectionLocation = await createTmpDir('import-json-url');

    await test.step('Enter the URL of a Postman collection on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(`${server.url}/postman.json`);
    });

    await test.step('Verify the field offers Enter to import', async () => {
      await expect(importPage.enterHint()).toHaveText('Enter to import');
      await expect(importPage.zipWarning()).toBeHidden();
    });

    await test.step('Press Enter in the text field', async () => {
      await importPage.textInput().press('Enter');
    });

    await test.step('Verify the location modal opens for the fetched collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
      await expect(openCollectionModal.root()).toBeHidden();
    });

    await test.step('Import into a temporary folder', async () => {
      await importLocators.locationInput().fill(collectionLocation);
      await importLocators.importButton().click();
    });

    await test.step('Verify the collection is in the sidebar and on disk', async () => {
      await expect(sidebar.collection('Sample Postman Collection')).toBeVisible();
      await expect.poll(() => fs.existsSync(path.join(collectionLocation, 'Sample Postman Collection', 'opencollection.yml'))).toBe(true);
    });
  });

  test('a pasted YAML URL loads right away and its OpenAPI spec offers the folder arrangement', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);

    await pasteImportText(page, `  ${server.url}/openapi.yaml\n`);

    await test.step('Verify the location modal offers the folder arrangement for the spec', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample API');
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });
  });

  test('a ZIP URL is flagged as not supported and is not loaded', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Paste the URL of a ZIP on the Import page', async () => {
      await pasteImportText(page, `${server.url}/collection.zip`);
    });

    await test.step('Verify the field keeps the URL and warns that ZIP URLs are not supported', async () => {
      await expect(importPage.textInput()).toHaveValue(`${server.url}/collection.zip`);
      await expect(importPage.zipWarning()).toHaveText('Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.');
      await expect(importPage.enterHint()).toBeHidden();
    });

    await test.step('Press Enter in the text field', async () => {
      await importPage.textInput().press('Enter');
    });

    await test.step('Verify nothing is loaded', async () => {
      await expect(importPage.loadingSpinner()).toBeHidden();
      await expect(importPage.textInput()).toBeEditable();
      await expect(openCollectionModal.pageView('import')).toBeVisible();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });

  test('a URL without a file extension is fetched and its format detected', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);

    await loadImportText(page, `${server.url}/plain`);

    await test.step('Verify the location modal opens for the Postman collection the URL returned', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('raw JSON loads on Enter', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Enter a Postman collection as one line of JSON on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(JSON.stringify(JSON.parse(postmanCollection)));
    });

    await test.step('Verify the field offers Enter to import', async () => {
      await expect(importPage.enterHint()).toHaveText('Enter to import');
    });

    await test.step('Press Enter in the text field', async () => {
      await importPage.textInput().press('Enter');
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('pasted multi-line YAML keeps its line breaks and loads the OpenAPI spec right away', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);

    await pasteImportText(page, openApiSpec);

    await test.step('Verify the location modal opens for the spec', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample API');
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });
  });

  test('while a URL loads, the text field is read-only and shows a spinner', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    const slowResponse = await test.step('Paste a URL whose response the server holds back', async () => {
      const slowRequest = once(server.server, 'request');
      await pasteImportText(page, `${server.url}/slow.json`);
      const [, response] = (await slowRequest) as [IncomingMessage, ServerResponse];
      return response;
    });

    await test.step('Verify the text field is read-only and shows the spinner instead of the Enter hint', async () => {
      await expect(importPage.textInput()).not.toBeEditable();
      await expect(importPage.loadingSpinner()).toBeVisible();
      await expect(importPage.enterHint()).toBeHidden();
    });

    await test.step('Send the response', async () => {
      slowResponse.end(postmanCollection);
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });
});
