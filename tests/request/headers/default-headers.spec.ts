import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../utils/page';
import { fillRequestHeaderName, fillRequestHeaderValue, readResponsePreviewBody, showInheritedHeaders } from '../../utils/request';
import { closeDevToolsConsole, openNetworkRequestDetails } from '../../utils/page/devtools-console';

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

test.describe('TC-6200', { tag: '@sanity' }, () => {
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
});

test.describe('TC-6201', { tag: '@sanity' }, () => {
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
});

test.describe('TC-6202', { tag: '@sanity' }, () => {
  for (const [name, key] of [
    ['Accept', 'accept'],
    ['User-Agent', 'user-agent'],
    ['Accept-Encoding', 'accept-encoding']
  ] as const) {
    test(`omits ${name} from the wire request when unchecked`, async ({ page, createTmpDir }) => {
      const dir = `default-headers-omit-${key}`;
      await createCollection(page, dir, await createTmpDir(dir));
      await createRequest(page, 'request-1', dir, { url: ECHO_HEADERS_URL });
      await selectRequestPaneTab(page, 'Headers');
      const headers = await showInheritedHeaders(page);

      await test.step(`Disable ${name} and send`, async () => {
        await headers.defaultRow(name).getByTestId('column-checkbox').uncheck();
        await sendRequest(page, 200);
      });

      await test.step(`Confirm ${name} is absent from echoed headers`, async () => {
        const body = await readResponsePreviewBody(page);
        expect(body).not.toMatch(new RegExp(`"${key}"\\s*:`, 'i'));
        expect(body).toMatch(/"host"\s*:/i);
      });
    });
  }

  test('omits Connection from the Timeline request when unchecked', async ({ page, createTmpDir }) => {
    await createCollection(page, 'default-headers-omit-connection', await createTmpDir('default-headers-omit-connection'));
    await createRequest(page, 'request-1', 'default-headers-omit-connection', { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');
    const headers = await showInheritedHeaders(page);

    await test.step('Disable Connection and send', async () => {
      await headers.defaultRow('Connection').getByTestId('column-checkbox').uncheck();
      await sendRequest(page, 200);
    });

    await test.step('Confirm Connection is absent from Timeline and Host is present', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const { timeline } = buildCommonLocators(page);
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();

      await expect(timeline.headerRow(timelineItem, 'Connection')).toHaveCount(0);
      await expect(timeline.headerRow(timelineItem, 'Host')).toHaveCount(1);
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

  test('still sends Host even though it cannot be omitted', async ({ page, createTmpDir }) => {
    await createCollection(page, 'default-headers-host-send', await createTmpDir('default-headers-host-send'));
    await createRequest(page, 'request-1', 'default-headers-host-send', { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');
    const headers = await showInheritedHeaders(page);

    await test.step('Confirm Host checkbox stays checked and disabled', async () => {
      await expect(headers.defaultRow('Host').getByTestId('column-checkbox')).toBeChecked();
      await expect(headers.defaultRow('Host').getByTestId('column-checkbox')).toBeDisabled();
    });

    await test.step('Send and confirm Host is present', async () => {
      await sendRequest(page, 200);
      const body = await readResponsePreviewBody(page);
      expect(body).toMatch(/"host"\s*:\s*"localhost:8081"/i);
    });
  });
});

test.describe('TC-6203', { tag: '@sanity' }, () => {
  test('sends exactly the headers shown in the Headers tab', async ({ page, createTmpDir }) => {
    await createCollection(page, 'default-headers-ui-wire', await createTmpDir('default-headers-ui-wire'));
    await createRequest(page, 'request-1', 'default-headers-ui-wire', { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');
    const headers = await showInheritedHeaders(page);

    await test.step('Add X-Test and uncheck Accept', async () => {
      await fillRequestHeaderName(page, headers.addRow(), 'X-Test');
      await fillRequestHeaderValue(page, headers.requestRow('X-Test'), 'qa-123');
      await expect(headers.addRow()).toBeVisible();
      await headers.defaultRow('Accept').getByTestId('column-checkbox').uncheck();
    });

    await test.step('UI shows the expected enabled headers', async () => {
      await expect(headers.requestRow('X-Test')).toBeVisible();
      await expect(headers.defaultRow('Accept').getByTestId('column-checkbox')).not.toBeChecked();
      for (const name of ['User-Agent', 'Accept-Encoding', 'Connection', 'Host']) {
        await expect(headers.defaultRow(name).getByTestId('column-checkbox')).toBeChecked();
      }
    });

    await test.step('Sent headers match the UI', async () => {
      await sendRequest(page, 200);
      const body = await readResponsePreviewBody(page);
      expect(body).toMatch(/"x-test"\s*:\s*"qa-123"/i);
      expect(body).toMatch(/"user-agent"\s*:/i);
      expect(body).toMatch(/"accept-encoding"\s*:/i);
      expect(body).toMatch(/"host"\s*:/i);
      expect(body).not.toMatch(/"accept"\s*:/i);
    });

    await test.step('Timeline request headers match the UI', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const { timeline } = buildCommonLocators(page);
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();

      for (const name of ['X-Test', 'User-Agent', 'Accept-Encoding', 'Connection', 'Host']) {
        await expect(timeline.headerRow(timelineItem, name)).toHaveCount(1);
      }
      await expect(timeline.headerRow(timelineItem, 'Accept')).toHaveCount(0);
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
});

test.describe('TC-6204', { tag: '@sanity' }, () => {
  for (const omitted of ['User-Agent', 'Accept', 'Accept-Encoding', 'Connection'] as const) {
    test(`DevTools Network omits ${omitted} when it is unchecked`, async ({ page, createTmpDir }) => {
      const dir = `default-headers-devtools-${omitted.toLowerCase()}`;
      await createCollection(page, dir, await createTmpDir(dir));
      await createRequest(page, 'request-1', dir, { url: ECHO_HEADERS_URL });
      await selectRequestPaneTab(page, 'Headers');
      const headers = await showInheritedHeaders(page);

      await test.step(`Disable ${omitted} and send`, async () => {
        await headers.defaultRow(omitted).getByTestId('column-checkbox').uncheck();
        await sendRequest(page, 200);
      });

      await test.step(`Confirm ${omitted} is absent from DevTools Network and the other defaults remain`, async () => {
        await openNetworkRequestDetails(page);
        const { devtools } = buildCommonLocators(page);

        await expect(devtools.requestHeaders.row(omitted)).toHaveCount(0);
        for (const name of DEFAULT_HEADERS.filter((name) => name !== omitted)) {
          await expect(devtools.requestHeaders.row(name)).toHaveCount(1);
        }
      });

      await closeDevToolsConsole(page);
    });
  }

  test('DevTools Network and Timeline list only Host when every omittable default is unchecked', async ({ page, createTmpDir }) => {
    await createCollection(page, 'default-headers-devtools-host-only', await createTmpDir('default-headers-devtools-host-only'));
    await createRequest(page, 'request-1', 'default-headers-devtools-host-only', { url: ECHO_HEADERS_URL });
    await selectRequestPaneTab(page, 'Headers');
    const headers = await showInheritedHeaders(page);
    const omitted = DEFAULT_HEADERS.filter((name) => name !== 'Host');

    await test.step('Disable every default except Host and send', async () => {
      for (const name of omitted) {
        await headers.defaultRow(name).getByTestId('column-checkbox').uncheck();
      }
      await sendRequest(page, 200);
    });

    let devtoolsLines: string[] = [];

    await test.step('DevTools Network lists only Host among the default headers', async () => {
      await openNetworkRequestDetails(page);
      const { devtools } = buildCommonLocators(page);

      await expect(devtools.requestHeaders.row('Host')).toHaveCount(1);
      for (const name of omitted) {
        await expect(devtools.requestHeaders.row(name)).toHaveCount(0);
      }
      devtoolsLines = (await devtools.requestHeaders.headerLines()).map((line) => line.toLowerCase()).sort();
    });

    await closeDevToolsConsole(page);

    await test.step('Timeline lists the same request headers', async () => {
      await selectResponsePaneTab(page, 'Timeline');
      const { timeline, timelineHeaders } = buildCommonLocators(page);
      const timelineItem = timeline.lastItem();
      await timeline.itemHeader(timelineItem).click();

      const timelineLines = (await timelineHeaders.headerLines()).map((line) => line.toLowerCase()).sort();
      expect(timelineLines).toEqual(devtoolsLines);
    });
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
