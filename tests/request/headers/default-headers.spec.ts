import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  sendRequest
} from '../../utils/page';
import { fillRequestHeaderName, fillRequestHeaderValue, readResponsePreviewBody, showDefaultHeaders } from '../../utils/request';

const DEFAULT_HEADERS = [
  'User-Agent',
  'Accept',
  'Accept-Encoding',
  'request-start-time',
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
  const headers = await showDefaultHeaders(page);

  await test.step('Show the default headers accordion', async () => {
    await expect(headers.defaultSectionToggle()).toHaveAttribute('aria-expanded', 'true');
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
  const headers = await showDefaultHeaders(page);

  await test.step('Collapse default headers without hiding request headers', async () => {
    await headers.defaultSectionToggle().click();

    await expect(headers.defaultSectionToggle()).toHaveAttribute('aria-expanded', 'false');
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
    await expect(headers.defaultSectionToggle()).toHaveAttribute('aria-expanded', 'false');
  });
});

test('hides defaults and shows a flat editable request headers table', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-hide', await createTmpDir('default-headers-hide'));
  await createRequest(page, 'request-1', 'default-headers-hide', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = buildCommonLocators(page).request.headers;

  await test.step('Start with defaults hidden', async () => {
    await expect(headers.defaultSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.addRow()).toBeVisible();
    await expect(headers.toggleDefaults()).toHaveText(`Show Inherited Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Keep hide state after switching request panes', async () => {
    await selectRequestPaneTab(page, 'Params');
    await selectRequestPaneTab(page, 'Headers');

    await expect(headers.defaultSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.toggleDefaults()).toHaveText(`Show Inherited Headers (${DEFAULT_HEADERS.length})`);
  });

  await test.step('Show defaults, then hide again', async () => {
    await headers.toggleDefaults().click();
    await expect(headers.defaultSectionRow()).toBeVisible();
    await expect(headers.requestSectionRow()).toBeVisible();
    await expect(headers.toggleDefaults()).toHaveText('Hide Inherited Headers');

    await headers.toggleDefaults().click();
    await expect(headers.defaultSectionRow()).not.toBeVisible();
    await expect(headers.requestSectionRow()).not.toBeVisible();
    await expect(headers.toggleDefaults()).toHaveText(`Show Inherited Headers (${DEFAULT_HEADERS.length})`);
  });
});

test('remembers an omitted default header while the request remains open', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-omit', await createTmpDir('default-headers-omit'));
  await createRequest(page, 'request-1', 'default-headers-omit', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showDefaultHeaders(page);
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

test('shows conflict warnings and ToolHint messages for matching default and request headers', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-conflicts', await createTmpDir('default-headers-conflicts'));
  await createRequest(page, 'request-1', 'default-headers-conflicts', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showDefaultHeaders(page);

  await test.step('Add an explicit User-Agent request header', async () => {
    await fillRequestHeaderName(page, headers.addRow(), 'User-Agent');
    await expect(headers.requestRow('User-Agent')).toBeVisible();
  });

  await test.step('Show conflict warnings on both headers', async () => {
    await expect(headers.defaultConflict('User-Agent')).toBeVisible();
    await expect(headers.requestConflict('User-Agent')).toBeVisible();

    await headers.defaultConflict('User-Agent').hover();
    await expect(headers.defaultConflictTooltip('User-Agent')).toHaveText('Overridden by a request header');

    await headers.requestConflict('User-Agent').hover();
    await expect(headers.requestConflictTooltip('User-Agent')).toHaveText('Overrides Bruno\'s default header');
  });
});

test('shows the runtime-default explanation through ToolHint', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-toolhint', await createTmpDir('default-headers-toolhint'));
  await createRequest(page, 'request-1', 'default-headers-toolhint', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showDefaultHeaders(page);

  await test.step('Explain a default header', async () => {
    await headers.defaultInfo('Accept').hover();
    await expect(headers.defaultInfoTooltip('Accept')).toHaveText('Automatically added at runtime');
  });

  await test.step('Explain the required Host header', async () => {
    await headers.defaultInfo('Host').hover();
    await expect(headers.defaultInfoTooltip('Host')).toHaveText('Required by HTTP, cannot be omitted');
  });
});

test('keeps an empty request-header add row while defaults are visible', async ({ page, createTmpDir }) => {
  await createCollection(page, 'default-headers-add-row', await createTmpDir('default-headers-add-row'));
  await createRequest(page, 'request-1', 'default-headers-add-row', { url: 'https://example.com' });
  await selectRequestPaneTab(page, 'Headers');
  const headers = await showDefaultHeaders(page);

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
  const headers = await showDefaultHeaders(page);

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
  const headers = await showDefaultHeaders(page);

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
  const headers = buildCommonLocators(page).request.headers;

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
