import * as http from 'http';
import { AddressInfo } from 'net';
import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, sendRequest } from '../../utils/page/actions';

const ZPL = '^XA^FO50,50^ADN,36,20^FDHello Bruno^FS^FO50,120^BY3^BCN,100,Y,N,N^FD12345678^FS^XZ';

const MINIMAL_PDF = `%PDF-1.4
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

test.describe('Label pane', () => {
  let server: http.Server;
  let baseUrl: string;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/zpl') {
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end(ZPL);
      } else if (req.url === '/zpl-json') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ label: Buffer.from(ZPL).toString('base64') }));
      } else if (req.url === '/zpl-xml-b64') {
        res.writeHead(200, { 'Content-Type': 'text/xml' }).end(`<?xml version="1.0"?><Shipment><LabelData><![CDATA[${Buffer.from(ZPL).toString('base64')}]]></LabelData></Shipment>`);
      } else if (req.url === '/pdf-xml') {
        res.writeHead(200, { 'Content-Type': 'application/soap+xml' }).end(`<?xml version="1.0"?><soap:Envelope><soap:Body><GraphicImage>${Buffer.from(MINIMAL_PDF).toString('base64')}</GraphicImage></soap:Body></soap:Envelope>`);
      } else if (req.url === '/plain-xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml' }).end('<note><to>Bruno</to><body>Nothing to print here at all.</body></note>');
      } else if (req.url === '/pdf') {
        res.writeHead(200, { 'Content-Type': 'application/pdf' }).end(MINIMAL_PDF);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
    server.close();
  });

  test('shows no label toggle for an ordinary response', async ({ page, createTmpDir }) => {
    await createCollection(page, 'label-none', await createTmpDir('label-none'));
    await createRequest(page, 'plain', 'label-none', { url: `${baseUrl}/json` });
    await sendRequest(page, 200);
    await expect(page.getByTestId('response-label-toggle')).toHaveCount(0);
  });

  test('renders a ZPL label after consent', async ({ page, createTmpDir }, testInfo) => {
    await createCollection(page, 'label-zpl', await createTmpDir('label-zpl'));
    await createRequest(page, 'zpl', 'label-zpl', { url: `${baseUrl}/zpl` });
    await sendRequest(page, 200);

    await page.getByTestId('response-label-toggle').click();
    await expect(page.getByTestId('label-pane')).toBeVisible();
    await page.getByTestId('label-allow-rendering').click();
    await expect(page.getByTestId('label-image')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: testInfo.outputPath('zpl.png') });
  });

  test('renders a ZPL label embedded as base64 in JSON', async ({ page, createTmpDir }, testInfo) => {
    await createCollection(page, 'label-json', await createTmpDir('label-json'));
    await createRequest(page, 'zpl-json', 'label-json', { url: `${baseUrl}/zpl-json` });
    await sendRequest(page, 200);

    await page.getByTestId('response-label-toggle').click();
    await expect(page.getByTestId('label-image')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: testInfo.outputPath('zpl-json.png') });
  });

  test('renders a ZPL label from base64 in XML', async ({ page, createTmpDir }, testInfo) => {
    await createCollection(page, 'label-xml-zpl', await createTmpDir('label-xml-zpl'));
    await createRequest(page, 'zpl-xml', 'label-xml-zpl', { url: `${baseUrl}/zpl-xml-b64` });
    await sendRequest(page, 200);

    await page.getByTestId('response-label-toggle').click();
    await expect(page.getByTestId('label-image')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: testInfo.outputPath('zpl-xml.png') });
  });

  test('renders a PDF label from base64 in SOAP XML', async ({ page, createTmpDir }, testInfo) => {
    await createCollection(page, 'label-xml-pdf', await createTmpDir('label-xml-pdf'));
    await createRequest(page, 'pdf-xml', 'label-xml-pdf', { url: `${baseUrl}/pdf-xml` });
    await sendRequest(page, 200);

    await page.getByTestId('response-label-toggle').click();
    await expect(page.getByTestId('label-pdf-body').locator('canvas')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: testInfo.outputPath('pdf-xml.png') });
  });

  test('shows no label toggle for an ordinary XML response', async ({ page, createTmpDir }) => {
    await createCollection(page, 'label-xml-none', await createTmpDir('label-xml-none'));
    await createRequest(page, 'plain-xml', 'label-xml-none', { url: `${baseUrl}/plain-xml` });
    await sendRequest(page, 200);
    await expect(page.getByTestId('response-label-toggle')).toHaveCount(0);
  });

  test('renders a PDF label', async ({ page, createTmpDir }, testInfo) => {
    await createCollection(page, 'label-pdf', await createTmpDir('label-pdf'));
    await createRequest(page, 'pdf', 'label-pdf', { url: `${baseUrl}/pdf` });
    await sendRequest(page, 200);

    await page.getByTestId('response-label-toggle').click();
    await expect(page.getByTestId('label-pdf-body').locator('canvas')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: testInfo.outputPath('pdf.png') });
  });
});
