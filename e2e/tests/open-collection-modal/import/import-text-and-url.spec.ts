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
import { buildImportPageLocators, loadImportText } from '../../../pages/open-collection-modal/import-page';
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

  test('a JSON URL is described, loaded and imported', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const openCollectionModal = buildOpenCollectionModalLocators(page);
    const importPage = buildImportPageLocators(page);
    const collectionLocation = await createTmpDir('import-json-url');

    await test.step('Enter the URL of a Postman collection on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(`${server.url}/postman.json`);
    });

    await test.step('Verify the hint reads the URL as JSON', async () => {
      await expect(importPage.hint()).toHaveText('JSON from a URL · Bruno detects Postman, Insomnia or OpenAPI');
    });

    await test.step('Load the URL', async () => {
      await importPage.loadButton().click();
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

  test('a YAML URL is described and its OpenAPI spec offers the folder arrangement', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Enter the URL of an OpenAPI spec on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(`${server.url}/openapi.yaml`);
    });

    await test.step('Verify the hint reads the URL as YAML', async () => {
      await expect(importPage.hint()).toHaveText('YAML from a URL · a Bruno collection is unpacked, an OpenAPI spec is converted');
    });

    await test.step('Load the URL', async () => {
      await importPage.loadButton().click();
    });

    await test.step('Verify the location modal offers the folder arrangement for the spec', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample API');
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });
  });

  test('a ZIP URL is flagged as not supported and cannot be loaded', async ({ pageWithUserData: page }) => {
    const importPage = buildImportPageLocators(page);

    await test.step('Enter the URL of a ZIP on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(`${server.url}/collection.zip`);
    });

    await test.step('Verify the hint warns that ZIP URLs are not supported and Load stays disabled', async () => {
      await expect(importPage.hint()).toHaveText('Bruno collection (.zip) from a URL · not supported yet. Download it and drop it here.');
      await expect(importPage.loadButton()).toBeDisabled();
    });
  });

  test('a URL without a file extension is fetched and its format detected', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Enter a URL with no file extension on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(`${server.url}/plain`);
    });

    await test.step('Verify the hint says the format is detected after fetching', async () => {
      await expect(importPage.hint()).toHaveText('URL · Bruno fetches it and detects the format');
    });

    await test.step('Load the URL', async () => {
      await importPage.loadButton().click();
    });

    await test.step('Verify the location modal opens for the Postman collection the URL returned', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('raw JSON is described as text and Enter loads it', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Enter a Postman collection as one line of JSON on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(JSON.stringify(JSON.parse(postmanCollection)));
    });

    await test.step('Verify the hint reads it as raw text', async () => {
      await expect(importPage.hint()).toHaveText('Raw text · Bruno detects the format');
    });

    await test.step('Press Enter in the text field', async () => {
      await importPage.textInput().press('Enter');
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('pasted multi-line YAML keeps its line breaks and loads the OpenAPI spec', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);

    await test.step('Paste an OpenAPI spec as YAML on the Import page and load it', async () => {
      await loadImportText(page, openApiSpec);
    });

    await test.step('Verify the location modal opens for the spec', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample API');
      await expect(importLocators.groupingDropdown()).toBeVisible();
    });
  });

  test('while a URL loads, the text field is read-only and Load is busy', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    const slowResponse = await test.step('Load a URL whose response the server holds back', async () => {
      const slowRequest = once(server.server, 'request');
      await loadImportText(page, `${server.url}/slow.json`);
      const [, response] = (await slowRequest) as [IncomingMessage, ServerResponse];
      return response;
    });

    await test.step('Verify the text field is read-only and Load is busy', async () => {
      await expect(importPage.textInput()).not.toBeEditable();
      await expect(importPage.loadButton()).toBeDisabled();
    });

    await test.step('Send the response', async () => {
      slowResponse.end(postmanCollection);
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });
});
