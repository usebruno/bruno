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
const wsdlService = fs.readFileSync(path.resolve(__dirname, '../../import/wsdl/fixtures/wsdl.xml'), 'utf8');

const linesOf = (count: number) => Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n');

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

  test('the text field grows a line at a time up to five lines, then scrolls', async ({ pageWithUserData: page }) => {
    const importPage = buildImportPageLocators(page);
    const measureField = () => importPage.textInput().evaluate((field: HTMLTextAreaElement) => ({
      height: field.offsetHeight,
      lineHeight: parseFloat(getComputedStyle(field).lineHeight),
      scrolls: field.scrollHeight > field.clientHeight
    }));
    const measureWithLines = async (count: number) => {
      await importPage.textInput().fill(linesOf(count));
      return measureField();
    };

    await test.step('Show the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
    });

    const empty = await test.step('Measure the empty field', () => measureField());
    const [one, three, five, eight] = await test.step('Fill in 1, 3, 5 and 8 lines and measure the field each time', async () => [
      await measureWithLines(1),
      await measureWithLines(3),
      await measureWithLines(5),
      await measureWithLines(8)
    ]);

    await test.step('Verify the field is one line high until there are more lines, then grows by a line each', () => {
      expect(one.height).toBe(empty.height);
      expect(three.height).toBe(one.height + 2 * one.lineHeight);
      expect(five.height).toBe(one.height + 4 * one.lineHeight);
      expect(five.scrolls).toBe(false);
    });

    await test.step('Verify the field stops at five lines and scrolls the rest', () => {
      expect(eight.height).toBe(five.height);
      expect(eight.scrolls).toBe(true);
    });
  });

  test('Shift+Enter adds a line without loading the text', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Type a line on the Import page and press Shift+Enter', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().pressSequentially('openapi: 3.0.0');
      await importPage.textInput().press('Shift+Enter');
      await importPage.textInput().pressSequentially('info: {}');
    });

    await test.step('Verify the text is on two lines and nothing is loaded', async () => {
      await expect(importPage.textInput()).toHaveValue('openapi: 3.0.0\ninfo: {}');
      await expect(importPage.loadingSpinner()).toBeHidden();
      await expect(importLocators.locationModal()).toBeHidden();
    });
  });

  test('text pasted into a field that already has text is added at the cursor and loads on Enter', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);
    const collectionJson = JSON.stringify(JSON.parse(postmanCollection));
    const typedLength = Math.floor(collectionJson.length / 2);

    await test.step('Enter the first half of a Postman collection on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill(collectionJson.slice(0, typedLength));
    });

    await test.step('Paste the second half at the end of the field', async () => {
      await page.evaluate((text) => navigator.clipboard.writeText(text), collectionJson.slice(typedLength));
      await importPage.textInput().press('ControlOrMeta+End');
      await importPage.textInput().press('ControlOrMeta+V');
    });

    await test.step('Verify the field holds the whole collection and nothing is loaded yet', async () => {
      await expect(importPage.textInput()).toHaveValue(collectionJson);
      await expect(importPage.enterHint()).toHaveText('Enter to import');
      await expect(importPage.loadingSpinner()).toBeHidden();
      await expect(importLocators.locationModal()).toBeHidden();
    });

    await test.step('Press Enter in the text field', async () => {
      await importPage.textInput().press('Enter');
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('text pasted over everything in the field loads right away', async ({ pageWithUserData: page }) => {
    const { import: importLocators } = buildCommonLocators(page);
    const importPage = buildImportPageLocators(page);

    await test.step('Enter some text on the Import page', async () => {
      await showOpenCollectionModal(page, 'import');
      await importPage.textInput().fill('https://example.com/old.json');
    });

    await test.step('Select all of it and paste the URL of a Postman collection over it', async () => {
      await page.evaluate((text) => navigator.clipboard.writeText(text), `${server.url}/postman.json`);
      await importPage.textInput().press('ControlOrMeta+A');
      await importPage.textInput().press('ControlOrMeta+V');
    });

    await test.step('Verify the location modal opens for the collection', async () => {
      await expect(importLocators.locationModal()).toContainText('Sample Postman Collection');
    });
  });

  test('pasted WSDL loads right away and is imported', async ({ pageWithUserData: page, createTmpDir }) => {
    const { import: importLocators, sidebar } = buildCommonLocators(page);
    const collectionLocation = await createTmpDir('import-pasted-wsdl');

    await pasteImportText(page, wsdlService);

    await test.step('Verify the location modal opens for the WSDL collection', async () => {
      await expect(importLocators.locationModal().getByText('WSDL Collection')).toBeVisible();
    });

    await test.step('Import into a temporary folder', async () => {
      await importLocators.locationInput().fill(collectionLocation);
      await importLocators.importButton().click();
    });

    await test.step('Verify the service is in the sidebar', async () => {
      await expect(sidebar.collection('TestWSDLServiceXML')).toBeVisible();
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
