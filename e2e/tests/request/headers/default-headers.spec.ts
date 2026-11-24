import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  fillRequestUrl,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest,
  readResponsePreviewBody
} from '../../../pages';
import { fillRequestHeaderName, fillRequestHeaderValue, showInheritedHeaders } from '../../../pages/request/headers';

const DEFAULT_HEADERS = [
  'User-Agent',
  'Accept',
  'Accept-Encoding',
  'Connection',
  'Host'
];

const ECHO_HEADERS_URL = 'http://localhost:8081/headers';

test.afterEach(async ({ page }) => {
  await closeAllCollections(page);
});

test('shows all default headers with Host disabled', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-catalog', await createTmpDir('default-headers-catalog'));
  await createRequest(page, 'request-1', 'default-headers-catalog', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Show the inherited headers accordion', async () => {
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('Show every known default header', async () => {
    for (const name of DEFAULT_HEADERS) {
      await expect(headers.defaultRow(name)).toBeVisible();
    }
  });

  await test.step('Allow omitting defaults except Host', async () => {
    for (const name of DEFAULT_HEADERS.filter((name) => name !== 'Host')) {
      await expect(headers.defaultRow(name).getByTestId('column-checkbox')).toBeChecked();
      await expect(headers.defaultRow(name).getByTestId('column-checkbox')).toBeEnabled();
    }

    await expect(headers.defaultRow('Host').getByTestId('column-checkbox')).toBeChecked();
    await expect(headers.defaultRow('Host').getByTestId('column-checkbox')).toBeDisabled();
  });
});

test('expands and collapses each headers accordion independently', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-accordions', await createTmpDir('default-headers-accordions'));
  await createRequest(page, 'request-1', 'default-headers-accordions', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Collapse inherited headers without hiding request headers', async () => {
    await headers.inheritedSectionToggle().click();

    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.addRow()).toBeVisible();
  });

  await test.step('Collapse and restore request headers independently', async () => {
    await headers.requestSectionToggle().click();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(headers.addRow()).not.toBeVisible();

    await headers.requestSectionToggle().click();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.addRow()).toBeVisible();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');
  });
});

test('hides inherited headers and shows a flat editable request headers table', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-hide', await createTmpDir('default-headers-hide'));
  await createRequest(page, 'request-1', 'default-headers-hide', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const { headers } = buildCommonLocators(page).request;

  await test.step('Start with inherited headers hidden', async () => {
    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.addRow()).toBeVisible();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Keep hide state after switching request panes', async () => {
    await selectRequestPaneTab(page, 'Params');
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Show inherited headers, then hide again', async () => {
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionRow()).toBeVisible();
    await expect(headers.requestSectionRow()).toBeVisible();
    await expect(headers.toggleInherited()).toHaveText('Hide Additional Headers');

    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
  });
});

test('opens the inherited headers accordion whenever they are shown', async ({ page, createTmpDir }) => {
  await createCollection(page, 'inherited-headers-reopen', await createTmpDir('inherited-headers-reopen'));
  await createRequest(page, 'request-1', 'inherited-headers-reopen', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Collapse inherited headers', async () => {
    await headers.inheritedSectionToggle().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
  });

  await test.step('Show again with the accordion open', async () => {
    await headers.toggleInherited().click();
    await headers.toggleInherited().click();

    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.defaultRow('User-Agent')).toBeVisible();
  });
});

test('remembers an omitted default header while the request remains open', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-omit', await createTmpDir('default-headers-omit'));
  await createRequest(page, 'request-1', 'default-headers-omit', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);
  const acceptCheckbox = headers.defaultRow('Accept').getByTestId('column-checkbox');

  await test.step('Disable Accept', async () => {
    await acceptCheckbox.uncheck();
    await expect(acceptCheckbox).not.toBeChecked();
  });

  await test.step('Keep the disabled state after navigating away and back', async () => {
    await selectRequestPaneTab(page, 'Params');
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.defaultRow('Accept').getByTestId('column-checkbox')).not.toBeChecked();
  });
});

test('does not hide a default header when the request name is only a prefix', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-prefix', await createTmpDir('default-headers-prefix'));
  await createRequest(page, 'request-1', 'default-headers-prefix', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Keep User-Agent after typing a prefix', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'User');
    await expect(headers.requestRow('User')).toBeVisible();
    await expect(headers.defaultRow('User-Agent')).toBeVisible();
    await expect(headers.defaultRow('Accept')).toBeVisible();
  });
});

test('hides a default header when the request defines the same name', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-precedence', await createTmpDir('default-headers-precedence'));
  await createRequest(page, 'request-1', 'default-headers-precedence', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Show the default User-Agent first', async () => {
    await expect(headers.defaultRow('User-Agent')).toBeVisible();
    await expect(headers.defaultRow('Accept')).toBeVisible();
  });

  await test.step('Hide the default after adding a request User-Agent', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'User-Agent');
    await expect(headers.requestRow('User-Agent')).toBeVisible();
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
    await expect(headers.defaultRow('Accept')).toBeVisible();
  });

  await test.step('Keep duplicate request headers visible', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'User-Agent');
    await expect(headers.requestRow('User-Agent')).toHaveCount(2);
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
  });
});

test('shows the runtime-default explanation through ToolHint', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-toolhint', await createTmpDir('default-headers-toolhint'));
  await createRequest(page, 'request-1', 'default-headers-toolhint', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Explain a default header', async () => {
    await headers.defaultInfo('Accept').hover();
    await expect(headers.defaultInfo('Accept')).toHaveCSS('cursor', 'pointer');
    await expect(headers.defaultInfoTooltip('Accept')).toHaveText('Automatically added at runtime');
  });

  await test.step('Explain the required Host header', async () => {
    await headers.defaultInfo('Host').hover();
    await expect(headers.defaultInfo('Host')).toHaveCSS('cursor', 'pointer');
    await expect(headers.defaultInfoTooltip('Host')).toHaveText('Automatically added at runtime. Required by HTTP, cannot be omitted');
  });
});

test('scrolls a long default header value horizontally', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-scroll', await createTmpDir('default-headers-scroll'));
  await createRequest(page, 'request-1', 'default-headers-scroll', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);
  const acceptValue = headers.defaultValueScroller('Accept');

  await test.step('Overflow the value cell', async () => {
    await expect.poll(() => acceptValue.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  await test.step('Scroll the value with a horizontal wheel', async () => {
    await acceptValue.hover();
    await page.mouse.wheel(200, 0);
    await expect.poll(() => acceptValue.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });
});

test('shows an angle-bracket Host placeholder before the host is known', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-host-placeholder', await createTmpDir('default-headers-host-placeholder'));
  await createRequest(page, 'request-1', 'default-headers-host-placeholder', { url: '{{host}}/path' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Show the Host placeholder enclosed in angle brackets', async () => {
    await expect(headers.defaultRow('Host')).toContainText('<derived from request URL>');
  });
});

test('keeps an empty request-header add row while defaults are visible', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-add-row', await createTmpDir('default-headers-add-row'));
  await createRequest(page, 'request-1', 'default-headers-add-row', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Start with one empty request header row', async () => {
    await expect(headers.addRow()).toBeVisible();
  });

  await test.step('Typing a name appends another empty row', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'X-Test');
    await expect(headers.requestRow('X-Test')).toBeVisible();
    await expect(headers.addRow()).toBeVisible();
  });
});

test('omits Accept from the wire request when unchecked', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-omit-send', await createTmpDir('default-headers-omit-send'));
  await createRequest(page, 'request-1', 'default-headers-omit-send', { url: ECHO_HEADERS_URL });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Disable Accept and send', async () => {
    await headers.defaultRow('Accept').getByTestId('column-checkbox').uncheck();
    await sendRequest(page, 200);
  });

  await test.step('Confirm Accept is absent from echoed headers', async () => {
    const body = await readResponsePreviewBody(page);
    expect(body).not.toMatch(/"accept"\s*:/i);
    expect(body).toMatch(/"host"\s*:/i);
  });
});

test('still sends Host even though it cannot be omitted', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-host-send', await createTmpDir('default-headers-host-send'));
  await createRequest(page, 'request-1', 'default-headers-host-send', { url: ECHO_HEADERS_URL });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showInheritedHeaders(page);

  await test.step('Confirm Host checkbox stays disabled', async () => {
    await expect(headers.defaultRow('Host').getByTestId('column-checkbox')).toBeDisabled();
  });

  await test.step('Send and confirm Host is present', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"host"\s*:\s*"localhost:8081"/i);
  });
});

test('sends an explicit request header instead of the matching default', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-override-send', await createTmpDir('default-headers-override-send'));
  await createRequest(page, 'request-1', 'default-headers-override-send', { url: ECHO_HEADERS_URL });
  await selectRequestPaneTab(page, 'Headers');
  const { headers } = buildCommonLocators(page).request;

  await test.step('Add an overriding User-Agent request header', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'User-Agent');
    await fillRequestHeaderValue(page, headers.requestRow('User-Agent'), 'custom-ua/1.0');
  });

  await test.step('Send and confirm the explicit value wins', async () => {
    await sendRequest(page, 200);
    const body = await readResponsePreviewBody(page);
    expect(body).toMatch(/"user-agent"\s*:\s*"custom-ua\/1\.0"/i);
    expect(body).not.toMatch(/bruno-runtime/i);
  });
});

test('TC-6200: Verify Headers tab hides Bruno default headers until Show Additional Headers is clicked', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const collectionName = 'default-headers-tc-6200';
  const { request } = buildCommonLocators(page);
  const headers = request.headers;
  const collectionTempDir = await createTmpDir(collectionName);
  const expectDefaultRowsHidden = async () => {
    for (const name of DEFAULT_HEADERS) {
      await expect(headers.defaultRow(name)).not.toBeVisible();
    }
  };

  await test.step('Open the request and show the Headers tab', async () => {
    await createCollection(page, collectionName, collectionTempDir);
    await createRequest(page, 'request-1', collectionName, { url: 'https://example.com' });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expectDefaultRowsHidden();
    await expect(headers.addRow()).toBeVisible();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Keep inherited headers hidden after switching to Params and back', async () => {
    await selectRequestPaneTab(page, 'Params');
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expectDefaultRowsHidden();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Show additional headers', async () => {
    await headers.toggleInherited().click();

    await expect(headers.inheritedSectionRow()).toBeVisible();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.defaultRow('User-Agent')).toBeVisible();
    await expect(headers.requestSectionRow()).toBeVisible();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.toggleInherited()).toHaveText('Hide Additional Headers');
  });

  await test.step('Collapse the Inherited headers accordion', async () => {
    await headers.inheritedSectionToggle().click();

    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.addRow()).toBeVisible();
  });

  await test.step('Collapse and re-expand Request headers independently', async () => {
    await headers.requestSectionToggle().click();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect(headers.addRow()).not.toBeVisible();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');

    await headers.requestSectionToggle().click();
    await expect(headers.requestSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.addRow()).toBeVisible();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  await test.step('Hide additional headers, then show them again', async () => {
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expectDefaultRowsHidden();
    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);

    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.defaultRow('User-Agent')).toBeVisible();
    await expect(headers.toggleInherited()).toHaveText('Hide Additional Headers');
  });
});

test('TC-6201: Verify default headers list shows User-Agent, Accept, Accept-Encoding, Connection and Host with Host locked', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const collectionName = 'default-headers-tc-6201';
  const { request } = buildCommonLocators(page);
  const headers = request.headers;
  const collectionTempDir = await createTmpDir(collectionName);
  const omittableHeaders = DEFAULT_HEADERS.filter((name) => name !== 'Host');

  await test.step('Open the request and show additional headers', async () => {
    await createCollection(page, collectionName, collectionTempDir);
    await createRequest(page, 'request-1', collectionName, { url: 'https://example.com' });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('List exactly the five default headers', async () => {
    await expect(headers.defaultRows()).toHaveCount(DEFAULT_HEADERS.length);
    for (const name of DEFAULT_HEADERS) {
      await expect(headers.defaultRow(name)).toBeVisible();
    }
  });

  await test.step('Keep omittable defaults checked and enabled', async () => {
    for (const name of omittableHeaders) {
      const checkbox = headers.defaultCheckbox(name);
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
    }
  });

  await test.step('Keep Host checked and ignore clicks', async () => {
    const hostCheckbox = headers.defaultCheckbox('Host');

    await expect(hostCheckbox).toBeChecked();
    await expect(hostCheckbox).toBeDisabled();
    await hostCheckbox.click({ force: true });
    await expect(hostCheckbox).toBeChecked();
    await expect(hostCheckbox).toBeDisabled();
  });

  await test.step('Verify runtime default info tooltip on hover for Accept header', async () => {
    await headers.defaultInfo('Accept').hover();
    await expect(headers.defaultInfo('Accept')).toHaveCSS('cursor', 'pointer');
    await expect(headers.defaultInfoTooltip('Accept')).toHaveText('Automatically added at runtime');
  });

  await test.step('Verify runtime default info tooltip explains Host header is required by HTTP', async () => {
    await headers.defaultInfo('Host').hover();
    await expect(headers.defaultInfo('Host')).toHaveCSS('cursor', 'pointer');
    await expect(headers.defaultInfoTooltip('Host')).toHaveText('Automatically added at runtime. Required by HTTP, cannot be omitted');
  });

  await test.step('Scroll a long Accept value horizontally', async () => {
    const acceptValue = headers.defaultValueScroller('Accept');

    await expect.poll(() => acceptValue.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await acceptValue.hover();
    await page.mouse.wheel(200, 0);
    await expect.poll(() => acceptValue.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  await test.step('Display derived placeholder when request URL contains unresolved host variable', async () => {
    await fillRequestUrl(page, '{{host}}/path', { replace: true });
    await expect(request.urlLine()).toContainText('{{host}}/path');
    await expect(headers.defaultRow('Host')).toContainText('<derived from request URL>');
  });
});

test('TC-6202: Verify unchecked default headers are not included in the HTTP request, while Host is always sent', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const collectionName = 'default-headers-tc-6202';
  const { request, timeline, timelineHeaders } = buildCommonLocators(page);
  const headers = request.headers;
  const collectionTempDir = await createTmpDir(collectionName);
  await test.step('Open the echo request and show additional headers', async () => {
    await createCollection(page, collectionName, collectionTempDir);
    await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('Omit Accept and confirm it is absent from the echoed headers', async () => {
    await headers.defaultCheckbox('Accept').uncheck();
    await sendRequest(page, 200);

    const body = await readResponsePreviewBody(page);
    expect(body).not.toMatch(/"accept"\s*:/i);
    expect(body).toMatch(/"host"\s*:/i);
  });

  await test.step('Restore Accept, omit User-Agent, and confirm User-Agent is absent', async () => {
    await headers.defaultCheckbox('Accept').check();
    await headers.defaultCheckbox('User-Agent').uncheck();
    await sendRequest(page, 200);
    await expect.poll(async () => readResponsePreviewBody(page)).toMatch(/"accept"\s*:/i);

    const body = await readResponsePreviewBody(page);
    expect(body).not.toMatch(/"user-agent"\s*:/i);
    expect(body).toMatch(/"accept"\s*:/i);
    expect(body).toMatch(/"host"\s*:/i);
  });

  await test.step('Restore User-Agent, omit Accept-Encoding, and confirm Accept-Encoding is absent', async () => {
    await headers.defaultCheckbox('User-Agent').check();
    await headers.defaultCheckbox('Accept-Encoding').uncheck();
    await sendRequest(page, 200);
    await expect.poll(async () => readResponsePreviewBody(page)).toMatch(/"user-agent"\s*:/i);

    const body = await readResponsePreviewBody(page);
    expect(body).not.toMatch(/"accept-encoding"\s*:/i);
    expect(body).toMatch(/"accept"\s*:/i);
    expect(body).toMatch(/"user-agent"\s*:/i);
    expect(body).toMatch(/"host"\s*:/i);
  });

  await test.step('Restore Accept-Encoding and confirm omitted Connection is absent from Timeline request headers', async () => {
    await headers.defaultCheckbox('Accept-Encoding').check();
    await headers.defaultCheckbox('Connection').uncheck();
    await sendRequest(page, 200);
    await expect.poll(async () => readResponsePreviewBody(page)).toMatch(/"accept-encoding"\s*:/i);

    const body = await readResponsePreviewBody(page);
    expect(body).not.toMatch(/"connection"\s*:/i);
    expect(body).toMatch(/"host"\s*:/i);

    await selectResponsePaneTab(page, 'Timeline');
    await timeline.itemHeader(timeline.items().first()).click();

    await expect(timelineHeaders.table()).toBeVisible();
    await expect(timelineHeaders.row('Connection')).toHaveCount(0);
    await expect(timelineHeaders.row('Host')).toHaveCount(1);
  });

  await test.step('Keep Connection unchecked after switching to Params and back to Headers', async () => {
    await selectRequestPaneTab(page, 'Params');
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.defaultCheckbox('Connection')).not.toBeChecked();
  });

  await test.step('Send Host even though its checkbox stays locked', async () => {
    await headers.defaultCheckbox('Connection').check();
    await expect(headers.defaultCheckbox('Host')).toBeChecked();
    await expect(headers.defaultCheckbox('Host')).toBeDisabled();
    await headers.defaultCheckbox('Host').click({ force: true });
    await expect(headers.defaultCheckbox('Host')).toBeChecked();

    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Response');
    await expect.poll(async () => readResponsePreviewBody(page)).toMatch(/"host"\s*:\s*"localhost:8081"/i);
  });
});

test('TC-6203: Verify the headers sent in the HTTP request match exactly what the Headers tab shows', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const collectionName = 'default-headers-tc-6203';
  const { request, timeline, timelineHeaders } = buildCommonLocators(page);
  const headers = request.headers;
  const collectionTempDir = await createTmpDir(collectionName);
  const enabledDefaults = ['User-Agent', 'Accept-Encoding', 'Connection', 'Host'];

  await test.step('Open the echo request and show additional headers', async () => {
    await createCollection(page, collectionName, collectionTempDir);
    await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('Add request header X-Test and keep an empty add row', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'X-Test');
    await fillRequestHeaderValue(page, headers.requestRow('X-Test'), 'qa-123');

    await expect(headers.requestRow('X-Test')).toBeVisible();
    await expect(headers.addRow()).toBeVisible();
  });

  await test.step('Uncheck Accept and leave the other default headers checked', async () => {
    await headers.defaultCheckbox('Accept').uncheck();

    await expect(headers.defaultCheckbox('Accept')).not.toBeChecked();
    for (const name of enabledDefaults) {
      await expect(headers.defaultCheckbox(name)).toBeChecked();
    }
  });

  await test.step('Show exactly the five enabled headers the request will send', async () => {
    await expect(headers.requestRow('X-Test')).toBeVisible();
    await expect(headers.defaultCheckbox('Accept')).not.toBeChecked();
    for (const name of enabledDefaults) {
      await expect(headers.defaultRow(name)).toBeVisible();
      await expect(headers.defaultCheckbox(name)).toBeChecked();
    }
  });

  // Values as the Headers tab shows them (lower-case names, like the echo). Host shows a placeholder, so it comes from the URL.
  const expectedHeaders = {
    'x-test': 'qa-123',
    'user-agent': await headers.defaultValueText('User-Agent').innerText(),
    'accept-encoding': await headers.defaultValueText('Accept-Encoding').innerText(),
    'connection': await headers.defaultValueText('Connection').innerText(),
    'host': new URL(ECHO_HEADERS_URL).host
  };

  await test.step('Send and confirm the echo body matches the enabled headers and their values', async () => {
    await sendRequest(page, 200);

    for (const [name, value] of Object.entries(expectedHeaders)) {
      await expect.poll(() => readResponsePreviewBody(page)).toContain(`"${name}": "${value}"`);
    }
    // Accept was unchecked, so the server must not have received it
    await expect.poll(() => readResponsePreviewBody(page)).not.toContain('"accept":');
  });

  await test.step('Confirm Timeline request headers match the same headers and values', async () => {
    await selectResponsePaneTab(page, 'Timeline');
    await timeline.itemHeader(timeline.items().first()).click();
    await expect(timelineHeaders.table()).toBeVisible();

    await expect(timelineHeaders.rows()).toHaveCount(Object.keys(expectedHeaders).length);
    for (const [name, value] of Object.entries(expectedHeaders)) {
      await expect(timelineHeaders.value(name)).toHaveText(value);
    }
  });

  await test.step('Replace the default User-Agent with a request header', async () => {
    await selectRequestPaneTab(page, 'Headers');
    await fillRequestHeaderName(page, headers.addRow(), 'User-Agent');
    await fillRequestHeaderValue(page, headers.requestRow('User-Agent'), 'custom-ua/1.0');

    await expect(headers.requestRow('User-Agent')).toBeVisible();
    await expect(headers.defaultRow('User-Agent')).not.toBeVisible();
    await expect(headers.defaultRow('Accept')).toBeVisible();
    await expect(headers.defaultRow('Accept-Encoding')).toBeVisible();
    await expect(headers.defaultRow('Connection')).toBeVisible();
    await expect(headers.defaultRow('Host')).toBeVisible();
  });

  await test.step('Send the explicit User-Agent instead of the runtime default', async () => {
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Response');
    await expect.poll(async () => readResponsePreviewBody(page)).toMatch(/"user-agent"\s*:\s*"custom-ua\/1\.0"/i);
    await expect.poll(async () => readResponsePreviewBody(page)).not.toMatch(/bruno-runtime/i);
  });
});

test('TC-6204: Verify Timeline shows only Host when all omittable default headers are unchecked', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
  const collectionName = 'default-headers-tc-6204';
  const { request, timeline, timelineHeaders } = buildCommonLocators(page);
  const headers = request.headers;
  const collectionTempDir = await createTmpDir(collectionName);
  const omittableHeaders = DEFAULT_HEADERS.filter((name) => name !== 'Host');
  const sentHeaderNames = async () =>
    (await timelineHeaders.headerLines())
      .map((line) => line.split(':')[0].trim().toLowerCase())
      .sort();

  await test.step('Open the echo request and show additional headers', async () => {
    await createCollection(page, collectionName, collectionTempDir);
    await createRequest(page, 'request-1', collectionName, { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.toggleInherited()).toHaveText(`Show Additional Headers (${DEFAULT_HEADERS.length})`);
    await headers.toggleInherited().click();
    await expect(headers.inheritedSectionToggle()).toHaveAttribute('aria-expanded', 'true');
    await expect(headers.addRow()).toBeVisible();
    for (const name of DEFAULT_HEADERS) {
      await expect(headers.defaultCheckbox(name)).toBeChecked();
    }
  });

  await test.step('Uncheck every omittable default and keep Host locked', async () => {
    for (const name of omittableHeaders) {
      await headers.defaultCheckbox(name).uncheck();
      await expect(headers.defaultCheckbox(name)).not.toBeChecked();
    }

    await expect(headers.defaultCheckbox('Host')).toBeChecked();
    await expect(headers.defaultCheckbox('Host')).toBeDisabled();
  });

  await test.step('Send the request', async () => {
    await sendRequest(page, 200);
  });

  await test.step('Show only Host in the Timeline request headers', async () => {
    await selectResponsePaneTab(page, 'Timeline');
    await timeline.itemHeader(timeline.items().first()).click();
    await expect(timelineHeaders.table()).toBeVisible();

    expect(await sentHeaderNames()).toEqual(['host']);
    for (const name of omittableHeaders) {
      await expect(timelineHeaders.row(name)).toHaveCount(0);
    }
    await expect(timelineHeaders.row('Host')).toHaveCount(1);
  });

  await test.step('Match the Timeline to the only enabled header on the Headers tab', async () => {
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.defaultCheckbox('Host')).toBeChecked();
    for (const name of omittableHeaders) {
      await expect(headers.defaultCheckbox(name)).not.toBeChecked();
    }
    expect(await sentHeaderNames()).toEqual(['host']);
  });

  await test.step('Send X-Test with the defaults still omitted and show only X-Test and Host', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'X-Test');
    await fillRequestHeaderValue(page, headers.requestRow('X-Test'), 'qa-123');
    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Timeline');
    const latestItem = timeline.items().first();
    await timeline.itemHeader(latestItem).click();

    await expect(timeline.headerValue(latestItem, 'X-Test')).toHaveText('qa-123');
    await expect(timeline.headerRow(latestItem, 'Host')).toHaveCount(1);
    for (const name of omittableHeaders) {
      await expect(timeline.headerRow(latestItem, name)).toHaveCount(0);
    }
  });
});
