import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandFolder,
  openFolderRequest,
  openRequest,
  selectRequestPaneTab,
  sendRequest
} from '../../utils/page';
import {
  fillRequestHeaderName,
  fillRequestHeaderValue,
  readResponsePreviewBody,
  seedCollectionHeaders,
  seedFolderHeaders,
  showInheritedHeaders
} from '../../utils/request';

const ECHO_HEADERS_URL = 'http://localhost:8081/headers';
const DEFAULT_HEADER_COUNT = 6;

test.afterEach(async ({ page }) => {
  await closeAllCollections(page);
});

test('keeps inherited headers hidden until shown', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-hidden';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, 'X-Collection: from-collection');
  await createRequest(page, 'request-1', collectionName, { url: 'https://example.com' });
  await openRequest(page, collectionName, 'request-1');
  await selectRequestPaneTab(page, 'Headers');

  const headers = page.getByTestId('request-headers-table');
  const toggle = page.getByTestId('toggle-inherited-headers');

  await test.step('Start with inherited headers hidden', async () => {
    await expect(toggle).toHaveText(`Show Inherited Headers (${DEFAULT_HEADER_COUNT + 1})`);
    await expect(page.getByTestId('inherited-header-row-x-collection')).not.toBeVisible();
    await expect(page.getByTestId('inherited-headers-section-row')).not.toBeVisible();
    await expect(headers).toBeVisible();
  });

  await test.step('Reveal inherited and runtime-default headers', async () => {
    const requestHeaders = await showInheritedHeaders(page);
    await expect(requestHeaders.inheritedRow('X-Collection')).toBeVisible();
    await expect(requestHeaders.inheritedRow('X-Collection').getByTestId('column-checkbox')).toBeDisabled();
    await expect(requestHeaders.defaultRow('User-Agent')).toBeVisible();
  });
});

test('does not list a disabled parent header', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-disabled-ui';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, [
    'X-Enabled: visible',
    '//X-Disabled: hidden'
  ].join('\n'));
  await createRequest(page, 'request-1', collectionName, { url: 'https://example.com' });
  await openRequest(page, collectionName, 'request-1');
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Show only the enabled inherited header', async () => {
    await expect(headers.inheritedRow('X-Enabled')).toBeVisible();
    await expect(headers.inheritedRow('X-Disabled')).not.toBeVisible();
  });
});

test('shows the folder header when collection and folder share a name', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-nearest-ui';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, 'X-Shared: from-collection');
  await createFolder(page, 'Inner', collectionName);
  await expandFolder(page, 'Inner');
  await seedFolderHeaders(page, collectionName, 'Inner', 'X-Shared: from-folder');
  await createRequest(page, 'request-1', 'Inner', { url: 'https://example.com', inFolder: true });
  await openFolderRequest(page, collectionName, 'Inner', 'request-1');
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('List the folder value once', async () => {
    await expect(headers.inheritedRow('X-Shared')).toBeVisible();
    await expect(headers.inheritedRow('X-Shared')).toContainText('from-folder');
    await expect(headers.inheritedRow('X-Shared')).not.toContainText('from-collection');
    await expect(page.getByTestId('inherited-header-row-x-shared')).toHaveCount(1);
  });
});

test('opens the source table and reveals the inherited header', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-reveal';
  const targetHeader = 'X-Reveal-Me';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, [
    'X-Inherited-Top: top',
    ...Array.from({ length: 25 }, (_, index) => `//X-Filler-${index + 1}: filler`),
    `${targetHeader}: reveal`
  ].join('\n'));
  await createRequest(page, 'request-1', collectionName, { url: 'https://example.com' });
  await openRequest(page, collectionName, 'request-1');
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Jump to the collection header and land on that row', async () => {
    await expect(headers.inheritedRow(targetHeader)).toBeVisible();
    await headers.inheritedSource(targetHeader).click();

    await expect(page.getByTestId('collection-settings-tab-headers')).toContainClass('active');
    const sourceRow = page.getByTestId('collection-headers').locator(`tr[data-row-name="${targetHeader}"]`);
    await expect(sourceRow).toBeVisible();
    await expect(sourceRow).toBeInViewport();
  });
});

test('sends collection headers on the wire', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-collection';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, [
    'X-Collection: from-collection',
    'X-Trace: collection-trace'
  ].join('\n'));
  await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
  await openRequest(page, collectionName, 'request-1');

  await test.step('Send and confirm collection headers were received', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-collection"\s*:\s*"from-collection"/i);
    expect(body).toMatch(/"x-trace"\s*:\s*"collection-trace"/i);
    expect(body).toMatch(/"host"\s*:\s*"localhost:8081"/i);
  });
});

test('sends folder headers on the wire', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-folder';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await createFolder(page, 'Inner', collectionName);
  await expandFolder(page, 'Inner');
  await seedFolderHeaders(page, collectionName, 'Inner', 'X-Folder: from-folder');
  await createRequest(page, 'request-1', 'Inner', { url: ECHO_HEADERS_URL, inFolder: true });
  await openFolderRequest(page, collectionName, 'Inner', 'request-1');

  await test.step('Send and confirm the folder header was received', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-folder"\s*:\s*"from-folder"/i);
  });
});

test('sends collection and folder headers together', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-both';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, 'X-Collection: from-collection');
  await createFolder(page, 'Inner', collectionName);
  await expandFolder(page, 'Inner');
  await seedFolderHeaders(page, collectionName, 'Inner', 'X-Folder: from-folder');
  await createRequest(page, 'request-1', 'Inner', { url: ECHO_HEADERS_URL, inFolder: true });
  await openFolderRequest(page, collectionName, 'Inner', 'request-1');

  await test.step('Send and confirm both inherited headers were received', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-collection"\s*:\s*"from-collection"/i);
    expect(body).toMatch(/"x-folder"\s*:\s*"from-folder"/i);
  });
});

test('sends the folder value when collection and folder share a name', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-nearest';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, 'X-Shared: from-collection');
  await createFolder(page, 'Inner', collectionName);
  await expandFolder(page, 'Inner');
  await seedFolderHeaders(page, collectionName, 'Inner', 'X-Shared: from-folder');
  await createRequest(page, 'request-1', 'Inner', { url: ECHO_HEADERS_URL, inFolder: true });
  await openFolderRequest(page, collectionName, 'Inner', 'request-1');

  await test.step('Send and confirm the nearest header wins', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-shared"\s*:\s*"from-folder"/i);
    expect(body).not.toMatch(/from-collection/i);
  });
});

test('sends the request value when it overrides an inherited header', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-override';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, 'X-Token: collection-token');
  await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
  await openRequest(page, collectionName, 'request-1');
  await selectRequestPaneTab(page, 'Headers');

  await test.step('Add a request header with the same name', async () => {
    const headers = page.getByTestId('request-headers-table');
    await fillRequestHeaderName(page, page.getByTestId('request-header-add-row'), 'X-Token');
    await fillRequestHeaderValue(page, page.getByTestId('request-header-row-x-token'), 'request-token');
    await expect(headers).toBeVisible();
  });

  await test.step('Send and confirm the request header wins', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-token"\s*:\s*"request-token"/i);
    expect(body).not.toMatch(/collection-token/i);
  });
});

test('does not send a disabled inherited header', async ({ page, createTmpDir }) => {
  const collectionName = 'inherited-headers-send-disabled';
  await createCollection(page, collectionName, await createTmpDir(collectionName));
  await seedCollectionHeaders(page, collectionName, [
    'X-Enabled: visible',
    '//X-Disabled: hidden'
  ].join('\n'));
  await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
  await openRequest(page, collectionName, 'request-1');

  await test.step('Send and confirm the disabled header is absent', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"x-enabled"\s*:\s*"visible"/i);
    expect(body).not.toMatch(/"x-disabled"\s*:/i);
  });
});
