import fs from 'fs';
import path from 'path';
import { ElectronApplication, expect, Locator, Page, test } from '../../../playwright';
import { closeAllCollections, expandCollection, expandFolder, selectResponsePaneTab, sendRequestAndWaitForResponse } from '../../utils/page/actions';
import { closeDevToolsConsole, openNetworkRequestDetails } from '../../utils/page/devtools-console';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionFromPath, waitForCollectionMount } from '../../utils/page/mounting';
import { buildRunnerLocators, openRunnerResultTimeline, runCollection } from '../../utils/page/runner';

/**
 * Every header a request actually sent, grouped by where it came from:
 * transport default -> collection -> folder -> request -> script.
 *
 * Four surfaces render this and must agree: the response Timeline's Request and Network tabs, and the
 * DevTools request-details Request and Network tabs.
 *
 * fixtures/collections/{bru,yml} are the same collection in both on-disk formats; each test runs once
 * per format so the two stay in lockstep.
 */

const COLLECTION = 'timeline-headers';
const REQUEST = 'get-headers';

// Added on the wire by axios/Node, not by any definition. `pattern` where the value isn't fixed.
const DEFAULT_HEADERS: Array<{ name: string; value?: string; pattern?: RegExp }> = [
  { name: 'accept', value: 'application/json, text/plain, */*' },
  { name: 'user-agent', pattern: /^bruno-runtime\// },
  { name: 'accept-encoding', value: 'gzip, compress, deflate, br' },
  { name: 'host', value: 'localhost:8081' },
  { name: 'connection', value: 'keep-alive' },
  { name: 'request-start-time', pattern: /^\d+$/ }
];

// Declared at all four levels with a different value each. The most specific declaration wins, so the
// table must show one row holding the request's value.
const SHARED_HEADER: [string, string] = ['shared-header-1', 'request-shared-value-1'];

// The values the outer levels declared for that same name. None may survive resolution.
const SHARED_HEADER_OUTER_VALUES = [
  'collection-shared-value-1',
  'folder-1-shared-value-1',
  'folder-2-shared-value-1'
];

/**
 * Every header the fixture sends, written out in the exact order the surfaces must show it. Spelled
 * out rather than generated: this is the expected result, so it should state what we want to see, not
 * re-apply the same rule the app applies.
 *
 * Each level declares seven headers under its own prefix and runs a script using every header API:
 * `-header-1/-2` are plain, `-set-header-1` is declared then reassigned by req.setHeader(),
 * `-set-header-2` is added by req.setHeader(), `-set-headers-1/-2` are added by req.setHeaders([...]),
 * `-interpolated-1` is declared as {{<level>-token-1}}, and the `-delete-*` names are removed by
 * req.deleteHeader()/req.deleteHeaders() (see DELETED_HEADERS).
 */
const ENTITY_HEADERS: Array<[string, string]> = [
  // Declared at the collection, untouched by any script.
  ['collection-header-1', 'collection-header-value-1'],
  ['collection-header-2', 'collection-header-value-2'],
  ['collection-interpolated-1', 'collection-interpolated-script-1'],

  // Declared in the folders.
  ['folder-1-header-1', 'folder-1-header-value-1'],
  ['folder-1-header-2', 'folder-1-header-value-2'],
  ['folder-1-interpolated-1', 'folder-1-interpolated-script-1'],
  ['folder-2-header-1', 'folder-2-header-value-1'],
  ['folder-2-header-2', 'folder-2-header-value-2'],
  ['folder-2-interpolated-1', 'folder-2-interpolated-script-1'],

  // Declared on the request. shared-header-1 is first because the collection declared that name
  // first, which fixes its slot, while the request's value is the one that wins.
  SHARED_HEADER,
  ['request-header-1', 'request-header-value-1'],
  ['request-header-2', 'request-header-value-2'],
  ['request-interpolated-1', 'request-interpolated-script-1'],

  // Set by a script. Reassigning an already-declared name keeps its original slot, so these four come
  // before every name a script added.
  ['collection-set-header-1', 'collection-set-header-script-1'],
  ['folder-1-set-header-1', 'folder-1-set-header-script-1'],
  ['folder-2-set-header-1', 'folder-2-set-header-script-1'],
  ['request-set-header-1', 'request-set-header-script-1'],

  // Added by a script, per level in the order that level added them.
  ['collection-set-header-2', 'collection-set-header-script-2'],
  ['collection-set-headers-1', 'collection-set-headers-script-1'],
  ['collection-set-headers-2', 'collection-set-headers-script-2'],
  ['folder-1-set-header-2', 'folder-1-set-header-script-2'],
  ['folder-1-set-headers-1', 'folder-1-set-headers-script-1'],
  ['folder-1-set-headers-2', 'folder-1-set-headers-script-2'],
  ['folder-2-set-header-2', 'folder-2-set-header-script-2'],
  ['folder-2-set-headers-1', 'folder-2-set-headers-script-1'],
  ['folder-2-set-headers-2', 'folder-2-set-headers-script-2'],
  ['request-set-header-2', 'request-set-header-script-2'],
  ['request-set-headers-1', 'request-set-headers-script-1'],
  ['request-set-headers-2', 'request-set-headers-script-2']
];

// Deleted by their level's script, so they never reach the wire and no surface may list them.
const DELETED_HEADERS = [
  'collection-delete-header-1',
  'collection-delete-headers-1',
  'collection-delete-headers-2',
  'folder-1-delete-header-1',
  'folder-1-delete-headers-1',
  'folder-1-delete-headers-2',
  'folder-2-delete-header-1',
  'folder-2-delete-headers-1',
  'folder-2-delete-headers-2',
  'request-delete-header-1',
  'request-delete-headers-1',
  'request-delete-headers-2'
];

const TOTAL_HEADER_COUNT = DEFAULT_HEADERS.length + ENTITY_HEADERS.length;

const fixtureFor = (format: 'bru' | 'yml') => path.join(__dirname, 'fixtures', 'collections', format);

// The timeline table and the DevTools table expose this same shape, so one helper can check either.
type HeadersSurface = {
  rows: () => Locator;
  row: (name: string) => Locator;
  value: (name: string) => Locator;
  headerLines: () => Promise<string[]>;
};

const nameOf = (line: string) => line.slice(0, line.indexOf(':')).toLowerCase();

/**
 * Checks one headers table completely: every category, exact values, exact total, exact order.
 * Returns the rendered "name: value" lines so the caller can hold the matching network log to them.
 */
const assertHeaderTable = async (headers: HeadersSurface, surface: string) => {
  // Transport defaults — one row each, exact value (or shape, for the two that vary per run).
  for (const { name, value, pattern } of DEFAULT_HEADERS) {
    await expect(headers.row(name), `${surface}: default "${name}"`).toHaveCount(1);
    await expect(headers.value(name), `${surface}: default "${name}"`).toHaveText(value ?? pattern!);
  }

  // Declared and script-set headers — one row each, exact value.
  for (const [name, value] of ENTITY_HEADERS) {
    await expect(headers.row(name), `${surface}: "${name}"`).toHaveCount(1);
    await expect(headers.value(name), `${surface}: "${name}"`).toHaveText(value);
  }

  // Deleted headers never reached the wire.
  for (const name of DELETED_HEADERS) {
    await expect(headers.row(name), `${surface}: deleted "${name}"`).toHaveCount(0);
  }

  const lines = await headers.headerLines();

  // Nothing beyond the categories above.
  expect(lines, `${surface}: total header count`).toHaveLength(TOTAL_HEADER_COUNT);

  // The defaults lead. Only their membership is pinned here — their order among themselves comes from
  // axios and Node, so asserting it would break on an unrelated upgrade.
  expect(lines.slice(0, DEFAULT_HEADERS.length).map(nameOf).sort(), `${surface}: defaults lead`).toEqual(
    DEFAULT_HEADERS.map(({ name }) => name).sort()
  );

  // Then every other header, grouped by source, in exactly this order with exactly these values.
  expect(lines.slice(DEFAULT_HEADERS.length), `${surface}: grouped by source`).toEqual(
    ENTITY_HEADERS.map(([name, value]) => `${name}: ${value}`)
  );

  // shared-header-1 is declared at all four levels. The row count above proves there is one row; this
  // proves it is the right one by ruling out every value an outer level would have supplied.
  for (const outerValue of SHARED_HEADER_OUTER_VALUES) {
    expect(lines.join('\n'), `${surface}: "${SHARED_HEADER[0]}" kept an outer value`).not.toContain(outerValue);
  }

  return lines;
};

test.describe('Timeline — response headers by source', () => {
  test.afterEach(async ({ page }) => {
    // An open console keeps re-rendering network logs, which races the collection dropdown on cleanup.
    await closeDevToolsConsole(page);
    await closeAllCollections(page);
  });

  const openFixtureCollection = async (
    page: Page,
    electronApp: ElectronApplication,
    createTmpDir: (tag?: string) => Promise<string>,
    format: 'bru' | 'yml'
  ) => {
    await test.step(`Open the ${format} fixture collection`, async () => {
      const collectionDir = await createTmpDir(`${COLLECTION}-${format}`);
      fs.cpSync(fixtureFor(format), collectionDir, { recursive: true });
      await openCollectionFromPath(page, electronApp, collectionDir);
      await waitForCollectionMount(page, COLLECTION);
    });
  };

  const openRequest = async (page: Page) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    await test.step('Reveal and open the request nested in folder-1/folder-2', async () => {
      await expandCollection(page, COLLECTION);
      await expandFolder(page, 'folder-1');
      await expandFolder(page, 'folder-2');

      const request = sidebar.request(REQUEST);
      await expect(request).toBeVisible();
      await request.click();
      await expect(tabs.activeRequestTab()).toContainText(REQUEST);
    });
  };

  /**
   * One send, checked on the response pane's Timeline: the Request tab's table, then the Network tab's
   * log, which must print the identical lines in the identical order.
   */
  const runResponseTimelineFor = (format: 'bru' | 'yml') => {
    test(`[${format}] response Timeline lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders, timeline } = buildCommonLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);
      await openRequest(page);

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      let tableLines: string[] = [];

      await test.step('Timeline → Request', async () => {
        await selectResponsePaneTab(page, 'Timeline');
        // Scripts change headers but add no timeline entry of their own; only the request does.
        await expect(timeline.items()).toHaveCount(1);
        await timeline.itemHeader(timeline.items().first()).click();
        await expect(timelineHeaders.table()).toBeVisible();

        tableLines = await assertHeaderTable(timelineHeaders, 'timeline Request tab');
      });

      await test.step('Timeline → Network prints the same lines in the same order', async () => {
        await timelineHeaders.networkTab().click();
        expect(await timelineHeaders.lastHopRequestHeaderLines(), 'timeline Network tab').toEqual(tableLines);
      });
    });
  };

  /**
   * The same send, checked on the DevTools console's request details. It reads the same payload through
   * a different component tree, so it can disagree with the Timeline.
   */
  const runDevToolsFor = (format: 'bru' | 'yml') => {
    test(`[${format}] DevTools request details lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { devtools } = buildCommonLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);
      await openRequest(page);

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      let tableLines: string[] = [];

      await test.step('DevTools → Network → request details → Request', async () => {
        await openNetworkRequestDetails(page);
        tableLines = await assertHeaderTable(devtools.requestHeaders, 'devtools Request tab');
      });

      await test.step('DevTools → Network → request details → Network prints the same lines', async () => {
        await devtools.detailsSubTab('network').click();
        expect(await devtools.lastHopRequestHeaderLines(), 'devtools Network tab').toEqual(tableLines);
      });
    });
  };

  /**
   * The runner reaches the renderer over its own request-sent payload, and its result items carry no
   * headers of their own — so grouping it correctly is separate from the send path above.
   */
  const runRunnerFor = (format: 'bru' | 'yml') => {
    test(`[${format}] runner timeline lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);

      await test.step('Expand the collection so its items are loaded, then run it', async () => {
        // The runner matches each result to a collection item by uid, so the tree must be loaded first.
        await expandCollection(page, COLLECTION);
        await runCollection(page, COLLECTION);
      });

      let tableLines: string[] = [];

      await test.step('Runner result → Timeline → Request', async () => {
        await openRunnerResultTimeline(page, REQUEST);
        // The runner has no `timeline-item` wrapper, so its rows are the entries themselves.
        await expect(runner.resultTimelineEntries()).toHaveCount(1);
        await expect(timelineHeaders.table()).toBeVisible();

        tableLines = await assertHeaderTable(timelineHeaders, 'runner Request tab');
      });

      await test.step('Runner result → Timeline → Network prints the same lines', async () => {
        await timelineHeaders.networkTab().click();
        expect(await timelineHeaders.lastHopRequestHeaderLines(), 'runner Network tab').toEqual(tableLines);
      });
    });
  };

  runResponseTimelineFor('bru');
  runResponseTimelineFor('yml');
  runDevToolsFor('bru');
  runDevToolsFor('yml');
  runRunnerFor('bru');
  runRunnerFor('yml');
});
