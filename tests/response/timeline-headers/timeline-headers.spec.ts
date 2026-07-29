import fs from 'fs';
import path from 'path';
import { expect, Locator, test } from '../../../playwright';
import { closeAllCollections, expandFolder, selectResponsePaneTab, sendRequestAndWaitForResponse } from '../../utils/page/actions';
import { closeDevToolsConsole, openNetworkRequestDetails } from '../../utils/page/devtools-console';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionFromPath, waitForCollectionMount } from '../../utils/page/mounting';

/**
 * Every header actually sent, grouped by source: default (transport) -> collection -> folder ->
 * request -> script. This exercises all entities at once — collection/folder/request settings
 * headers plus headers set from pre-request scripts (req.setHeaders with an array of entries) at
 * collection, two nested folders, and request level — then asserts each
 * header's exact value on both surfaces that render them: the response-pane Timeline and the
 * DevTools Console → Network → request-details Request tab. Includes the transport defaults added
 * on the wire (accept, user-agent, accept-encoding, host, connection, request-start-time).
 *
 * Fixtures under fixtures/collections/{bru,yml} declare the identical collection in both on-disk
 * formats; the suite runs once per format so behaviour stays in lockstep.
 */

const COLLECTION = 'timeline-headers';
const REQUEST = 'get-headers';

// Transport/"default" headers Bruno + axios add on the wire (not part of any definition).
// They only reach the UI via the network-log backfill, so they're the regression-prone set —
// asserted explicitly on their own. `value` is checked exactly; `pattern` where it isn't fixed
// (runtime version, timestamp).
const DEFAULT_HEADERS: Array<{ name: string; value?: string; pattern?: RegExp }> = [
  { name: 'accept', value: 'application/json, text/plain, */*' },
  { name: 'user-agent', pattern: /^bruno-runtime\// },
  { name: 'accept-encoding', value: 'gzip, compress, deflate, br' },
  { name: 'host', value: 'localhost:8081' },
  { name: 'connection', value: 'keep-alive' },
  { name: 'request-start-time', pattern: /^\d+$/ }
];

// Headers we configure across every entity — collection/folder/request settings and pre-request
// scripts (req.setHeaders([{…-1}, {…-2}]) at each level). All exact, and numbered so each row is
// unambiguous.
const ENTITY_HEADERS: Array<[string, string]> = [
  // collection settings
  ['collection-header-1', 'collection-header-value-1'],
  ['collection-header-2', 'collection-header-value-2'],
  // folder-1 settings
  ['folder-1-header-1', 'folder-1-header-value-1'],
  ['folder-1-header-2', 'folder-1-header-value-2'],
  // folder-2 settings (nested inside folder-1)
  ['folder-2-header-1', 'folder-2-header-value-1'],
  ['folder-2-header-2', 'folder-2-header-value-2'],
  // request settings
  ['request-header-1', 'request-header-value-1'],
  ['request-header-2', 'request-header-value-2'],
  // pre-request scripts at each level
  ['collection-script-header-1', 'collection-script-value-1'],
  ['collection-script-header-2', 'collection-script-value-2'],
  ['folder-1-script-header-1', 'folder-1-script-value-1'],
  ['folder-1-script-header-2', 'folder-1-script-value-2'],
  ['folder-2-script-header-1', 'folder-2-script-value-1'],
  ['folder-2-script-header-2', 'folder-2-script-value-2'],
  ['request-script-header-1', 'request-script-value-1'],
  ['request-script-header-2', 'request-script-value-2']
];

const TOTAL_HEADER_COUNT = DEFAULT_HEADERS.length + ENTITY_HEADERS.length;

const fixtureFor = (format: 'bru' | 'yml') => path.join(__dirname, 'fixtures', 'collections', format);

// A headers surface exposes { rows, row(name), value(name) }. Both the timeline table and the
// DevTools request-details table share this shape so one helper verifies each identically.
type HeadersSurface = {
  rows: () => Locator;
  row: (name: string) => Locator;
  value: (name: string) => Locator;
};

// Every header the Request-tab table shows, as a lowercased "name: value" set. The network log is a
// wire trace so its ordering differs by design — the *set* is what must match.
const expectedHeaderSet = (userAgent: string, startTime: string) =>
  new Set(
    [
      ...DEFAULT_HEADERS.map(({ name, value }) => {
        if (name === 'user-agent') return `user-agent: ${userAgent}`;
        if (name === 'request-start-time') return `request-start-time: ${startTime}`;
        return `${name}: ${value}`;
      }),
      ...ENTITY_HEADERS.map(([name, value]) => `${name}: ${value}`)
    ].map((line) => line.toLowerCase())
  );

// The network log renders "Name: value" lines; compare case-insensitively since the wire casing
// (Host, Accept-Encoding) differs from the lowercased definition names.
const assertSameHeaderSet = (lines: string[], surface: string) => {
  const actual = lines.map((line) => line.toLowerCase());
  expect(actual, `${surface}: one line per sent header`).toHaveLength(TOTAL_HEADER_COUNT);

  // user-agent and request-start-time aren't fixed, so take them from the log itself and assert shape.
  const valueOf = (name: string) =>
    actual.find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2) ?? '';
  expect(valueOf('user-agent'), `${surface}: user-agent`).toMatch(/^bruno-runtime\//);
  expect(valueOf('request-start-time'), `${surface}: request-start-time`).toMatch(/^\d+$/);

  expect(new Set(actual), `${surface}: same header set as the Request tab`).toEqual(
    expectedHeaderSet(valueOf('user-agent'), valueOf('request-start-time'))
  );
};

const assertAllHeaders = async (headers: HeadersSurface) => {
  // Per-header first so a missing/mismatched header is named in the failure...
  for (const { name, value, pattern } of DEFAULT_HEADERS) {
    // Present exactly once (the row must exist — not merely be a substring of another).
    await expect(headers.row(name), `default header "${name}"`).toHaveCount(1);
    await expect(headers.value(name), `default header "${name}"`).toHaveText(value ?? pattern!);
  }

  for (const [name, value] of ENTITY_HEADERS) {
    await expect(headers.value(name), `header "${name}"`).toHaveText(value);
  }

  // ...then guard against stray extras.
  await expect(headers.rows()).toHaveCount(TOTAL_HEADER_COUNT);
};

test.describe('Timeline — response headers by source', () => {
  test.afterEach(async ({ page }) => {
    // The last step leaves the DevTools console open. Close it before removing collections so its
    // streaming re-renders don't race the collection dropdown during cleanup.
    await closeDevToolsConsole(page);
    await closeAllCollections(page);
  });

  const runFor = (format: 'bru' | 'yml') => {
    test(`[${format}] lists every sent header (default / collection / folder / request / script) with exact values`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders, timeline, sidebar, tabs, devtools } = buildCommonLocators(page);

      await test.step('Open the fixture collection (headers + scripts at collection, nested folders, and request)', async () => {
        const collectionDir = await createTmpDir(`${COLLECTION}-${format}`);
        fs.cpSync(fixtureFor(format), collectionDir, { recursive: true });
        await openCollectionFromPath(page, electronApp, collectionDir);
        await waitForCollectionMount(page, COLLECTION);
      });

      await test.step('Reveal and open the request nested in folder-1/folder-2', async () => {
        const folder1 = sidebar.folder('folder-1');
        if (!(await folder1.isVisible().catch(() => false))) {
          await sidebar.collection(COLLECTION).click();
          await expect(folder1).toBeVisible();
        }
        // expandFolder decides from the chevron's state, so it's a no-op when already expanded —
        // unlike a bare click, which would collapse a folder that opened while we were looking.
        await expandFolder(page, 'folder-1');
        await expect(sidebar.folder('folder-2')).toBeVisible();
        await expandFolder(page, 'folder-2');

        const request = sidebar.request(REQUEST);
        await expect(request).toBeVisible();
        await request.click();
        await expect(tabs.activeRequestTab()).toContainText(REQUEST);
      });

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      await test.step('Response Timeline lists every header from every source with exact values', async () => {
        await selectResponsePaneTab(page, 'Timeline');
        // Pre-request scripts mutate headers but do not create their own entries — only the main request does.
        await expect(timeline.items()).toHaveCount(1);
        await timeline.itemHeader(timeline.items().first()).click();
        await expect(timelineHeaders.table()).toBeVisible();
        await assertAllHeaders(timelineHeaders);

        // Headers render grouped by source (transport defaults first, then collection, folder,
        // request, script). The entity block is always the tail, and must appear in that exact
        // order. The defaults form the leading block (covered above); their internal order follows
        // the wire and isn't pinned here.
        const orderedNames = (await timelineHeaders.names().allTextContents()).map((name) => name.trim().toLowerCase());
        const expectedEntityOrder = ENTITY_HEADERS.map(([name]) => name.toLowerCase());
        expect(orderedNames.slice(-expectedEntityOrder.length)).toEqual(expectedEntityOrder);
      });

      await test.step('The Timeline Network tab shows the same headers as its Request tab', async () => {
        await timelineHeaders.networkTab().click();
        assertSameHeaderSet(await timelineHeaders.lastHopRequestHeaderLines(), 'timeline Network tab');
      });

      await test.step('DevTools Console → Network → request details lists the identical headers', async () => {
        await openNetworkRequestDetails(page);
        await assertAllHeaders(devtools.requestHeaders);
      });

      await test.step('The DevTools Network sub-tab shows the same headers too', async () => {
        await devtools.detailsSubTab('Network').click();
        assertSameHeaderSet(await devtools.lastHopRequestHeaderLines(), 'devtools Network tab');
      });
    });
  };

  runFor('bru');
  runFor('yml');
});
