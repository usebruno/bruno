import * as http from 'http';
import path from 'path';
import { AddressInfo } from 'net';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, openRequest, sendRequest, waitForReadyPage } from '../../utils/page';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'label-collection';

const ZPL = '^XA^FO50,50^ADN,36,20^FDHello Bruno^FS^XZ';
const SECOND_ZPL = '^XA^FO50,50^ADN,36,20^FDSecond label^FS^XZ';

const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 20 100 Td (PDF label) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`;

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const toBase64 = (text: string) => Buffer.from(text).toString('base64');

// Responses served by the API under test: [content type, body]
const RESPONSES: Record<string, [string, string]> = {
  '/zpl': ['text/plain', ZPL],
  '/zpl-multi': ['text/plain', `${ZPL}\n${SECOND_ZPL}`],
  '/zpl-json': ['application/json', JSON.stringify({ shipment: { label: toBase64(ZPL) } })],
  '/zpl-xml': ['text/xml', `<?xml version="1.0"?><Shipment><LabelData><![CDATA[${toBase64(SECOND_ZPL)}]]></LabelData></Shipment>`],
  '/pdf': ['application/pdf', PDF],
  '/pdf-json': ['application/json', JSON.stringify({ labels: [{ content: toBase64(PDF) }] })],
  '/pdf-xml': ['application/soap+xml', `<?xml version="1.0"?><soap:Envelope><soap:Body><GraphicImage>${toBase64(PDF)}</GraphicImage></soap:Body></soap:Envelope>`],
  '/plain-json': ['application/json', JSON.stringify({ ok: true })],
  '/plain-xml': ['application/xml', '<note><to>Bruno</to><body>Nothing to print here at all.</body></note>']
};

const listen = async (server: http.Server) => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
};

test.describe('Response label pane', () => {
  let apiServer: http.Server;
  let labelaryServer: http.Server;
  let apiUrl: string;
  let labelaryUrl: string;
  // ZPL bodies the mock Labelary endpoint received, in order
  let renderedZpl: string[];

  test.beforeEach(async () => {
    renderedZpl = [];

    apiServer = http.createServer((req, res) => {
      const [contentType, body] = RESPONSES[req.url || ''] ?? ['text/plain', 'not found'];
      res.writeHead(RESPONSES[req.url || ''] ? 200 : 404, { 'Content-Type': contentType }).end(body);
    });
    labelaryServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        renderedZpl.push(body);
        res.writeHead(200, { 'Content-Type': 'image/png' }).end(ONE_PIXEL_PNG);
      });
    });

    apiUrl = await listen(apiServer);
    labelaryUrl = await listen(labelaryServer);
  });

  test.afterEach(async () => {
    apiServer.close();
    labelaryServer.close();
  });

  const launchWithRequests = async (
    { launchElectronApp, createTmpDir }: { launchElectronApp: any; createTmpDir: (tag?: string) => Promise<string> },
    requests: Record<string, string>
  ) => {
    const collectionDir = path.join(await createTmpDir('label-pane'), COLLECTION_NAME);
    initBruCollection(collectionDir, COLLECTION_NAME);
    Object.entries(requests).forEach(([name, endpoint], index) => {
      writeBruRequest(collectionDir, name, { seq: index + 1, url: `${apiUrl}${endpoint}` });
    });

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: {
        collectionPath: collectionDir.split(path.sep).join('/'),
        labelaryEndpoint: labelaryUrl
      }
    });
    const page = await waitForReadyPage(app);
    return { page, locators: buildCommonLocators(page).responseLabel };
  };

  test('offers no label preview for ordinary JSON and XML responses', async ({ launchElectronApp, createTmpDir }) => {
    const { page, locators } = await launchWithRequests(
      { launchElectronApp, createTmpDir },
      { 'plain-json': '/plain-json', 'plain-xml': '/plain-xml' }
    );

    for (const requestName of ['plain-json', 'plain-xml']) {
      await openRequest(page, COLLECTION_NAME, requestName);
      await sendRequest(page, 200);
      await expect(locators.toggle()).toHaveCount(0);
    }
  });

  test('renders a ZPL label only after the user allows sending it to the render endpoint', async ({ launchElectronApp, createTmpDir }) => {
    const { page, locators } = await launchWithRequests({ launchElectronApp, createTmpDir }, { 'zpl-plain': '/zpl' });

    await openRequest(page, COLLECTION_NAME, 'zpl-plain');
    await sendRequest(page, 200);
    await locators.toggle().click();

    await expect(locators.allowRendering()).toBeVisible();
    await expect(locators.renderedImage()).toHaveCount(0);
    expect(renderedZpl).toEqual([]);

    await locators.allowRendering().click();
    await expect(locators.renderedImage()).toBeVisible();
    expect(renderedZpl).toEqual([ZPL]);
  });

  test('finds ZPL labels inside JSON and XML responses', async ({ launchElectronApp, createTmpDir }) => {
    const { page, locators } = await launchWithRequests(
      { launchElectronApp, createTmpDir },
      { 'zpl-in-json': '/zpl-json', 'zpl-in-xml': '/zpl-xml' }
    );

    await openRequest(page, COLLECTION_NAME, 'zpl-in-json');
    await sendRequest(page, 200);
    await locators.toggle().click();
    await locators.allowRendering().click();
    await expect(locators.renderedImage()).toBeVisible();

    await openRequest(page, COLLECTION_NAME, 'zpl-in-xml');
    await sendRequest(page, 200);
    await locators.toggle().click();
    await expect(locators.renderedImage()).toBeVisible();

    expect(renderedZpl).toEqual([ZPL, SECOND_ZPL]);
  });

  test('pages through several labels in one response', async ({ launchElectronApp, createTmpDir }) => {
    const { page, locators } = await launchWithRequests({ launchElectronApp, createTmpDir }, { 'zpl-multi': '/zpl-multi' });

    await openRequest(page, COLLECTION_NAME, 'zpl-multi');
    await sendRequest(page, 200);
    await locators.toggle().click();
    await locators.allowRendering().click();
    await expect(locators.position()).toHaveText('Label 1 of 2');
    await expect(locators.renderedImage()).toBeVisible();

    await locators.next().click();
    await expect(locators.position()).toHaveText('Label 2 of 2');
    await expect.poll(() => renderedZpl).toEqual([ZPL, SECOND_ZPL]);
    await expect(locators.next()).toBeDisabled();
  });

  test('previews PDF labels returned directly, in JSON and in XML', async ({ launchElectronApp, createTmpDir }) => {
    const { page, locators } = await launchWithRequests(
      { launchElectronApp, createTmpDir },
      { 'pdf-direct': '/pdf', 'pdf-in-json': '/pdf-json', 'pdf-in-xml': '/pdf-xml' }
    );

    for (const requestName of ['pdf-direct', 'pdf-in-json', 'pdf-in-xml']) {
      await openRequest(page, COLLECTION_NAME, requestName);
      await sendRequest(page, 200);
      await locators.toggle().click();
      await expect(locators.pdfCanvas()).toBeVisible();
      await expect(locators.downloadPdf()).toBeVisible();
    }
    expect(renderedZpl).toEqual([]);
  });
});
