import fs from 'fs';
import path from 'path';
import { ElectronApplication, expect, Locator, Page, test } from '../../../playwright';
import { closeAllCollections, expandCollection, expandFolder, selectResponsePaneTab, sendRequestAndWaitForResponse } from '../../utils/page/actions';
import { closeDevToolsConsole, openNetworkRequestDetails } from '../../utils/page/devtools-console';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionFromPath, waitForCollectionMount } from '../../utils/page/mounting';
import { buildRunnerLocators, openRunnerResultTimeline, runCollection } from '../../utils/page/runner';

const COLLECTION = 'timeline-headers';
const REQUEST = 'get-headers';

const DEFAULT_HEADERS: Array<{ name: string; value?: string; pattern?: RegExp }> = [
  { name: 'accept', value: 'application/json, text/plain, */*' },
  { name: 'user-agent', pattern: /^bruno-runtime\// },
  { name: 'accept-encoding', value: 'gzip, compress, deflate, br' },
  { name: 'host', value: 'localhost:8081' },
  { name: 'connection', value: 'keep-alive' },
  { name: 'request-start-time', pattern: /^\d+$/ }
];

const SHARED_HEADER: [string, string] = ['shared-header-1', 'request-shared-value-1'];

// The values the outer levels declared for that same name. None may survive resolution.
const SHARED_HEADER_OUTER_VALUES = [
  'collection-shared-value-1',
  'folder-1-shared-value-1',
  'folder-2-shared-value-1'
];

const ENTITY_HEADERS: Array<[string, string]> = [
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

  SHARED_HEADER,
  ['request-header-1', 'request-header-value-1'],
  ['request-header-2', 'request-header-value-2'],
  ['request-interpolated-1', 'request-interpolated-script-1'],

  ['collection-set-header-1', 'collection-set-header-script-1'],
  ['folder-1-set-header-1', 'folder-1-set-header-script-1'],
  ['folder-2-set-header-1', 'folder-2-set-header-script-1'],
  ['request-set-header-1', 'request-set-header-script-1'],

  ['collection-set-header-2', 'collection-set-header-script-2'],
  ['folder-1-set-header-2', 'folder-1-set-header-script-2'],
  ['folder-2-set-header-2', 'folder-2-set-header-script-2'],
  ['request-set-header-2', 'request-set-header-script-2']
];

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

type HeadersSurface = {
  rows: () => Locator;
  row: (name: string) => Locator;
  value: (name: string) => Locator;
  headerLines: () => Promise<string[]>;
};

const assertHeaderTable = async (headers: HeadersSurface, surface: string) => {
  for (const { name, value, pattern } of DEFAULT_HEADERS) {
    await expect(headers.row(name), `${surface}: default "${name}"`).toHaveCount(1);
    await expect(headers.value(name), `${surface}: default "${name}"`).toHaveText(value ?? pattern!);
  }

  for (const [name, value] of ENTITY_HEADERS) {
    await expect(headers.row(name), `${surface}: "${name}"`).toHaveCount(1);
    await expect(headers.value(name), `${surface}: "${name}"`).toHaveText(value);
  }

  for (const name of DELETED_HEADERS) {
    await expect(headers.row(name), `${surface}: deleted "${name}"`).toHaveCount(0);
  }

  const lines = await headers.headerLines();

  expect(lines, `${surface}: total header count`).toHaveLength(TOTAL_HEADER_COUNT);

  for (const outerValue of SHARED_HEADER_OUTER_VALUES) {
    expect(lines.join('\n'), `${surface}: "${SHARED_HEADER[0]}" kept an outer value`).not.toContain(outerValue);
  }

  return lines;
};

test.describe('Timeline - response headers by source', () => {
  test.afterEach(async ({ page }) => {
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

  const runResponseTimelineFor = (format: 'bru' | 'yml') => {
    test(`[${format}] response Timeline lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders, timeline } = buildCommonLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);
      await openRequest(page);

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      let tableLines: string[] = [];

      await test.step('Timeline -> Request', async () => {
        await selectResponsePaneTab(page, 'Timeline');
        await expect(timeline.items()).toHaveCount(1);
        await timeline.itemHeader(timeline.items().first()).click();
        await expect(timelineHeaders.table()).toBeVisible();

        tableLines = await assertHeaderTable(timelineHeaders, 'timeline Request tab');
      });

      await test.step('Timeline -> Network prints the same lines in the same order', async () => {
        await timelineHeaders.networkTab().click();
        expect(await timelineHeaders.lastHopRequestHeaderLines(), 'timeline Network tab').toEqual(tableLines);
      });
    });
  };

  const runDevToolsFor = (format: 'bru' | 'yml') => {
    test(`[${format}] DevTools request details lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { devtools } = buildCommonLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);
      await openRequest(page);

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      let tableLines: string[] = [];

      await test.step('DevTools -> Network -> request details -> Request', async () => {
        await openNetworkRequestDetails(page);
        tableLines = await assertHeaderTable(devtools.requestHeaders, 'devtools Request tab');
      });

      await test.step('DevTools -> Network -> request details -> Network prints the same lines', async () => {
        await devtools.detailsSubTab('network').click();
        expect(await devtools.lastHopRequestHeaderLines(), 'devtools Network tab').toEqual(tableLines);
      });
    });
  };

  const runRunnerFor = (format: 'bru' | 'yml') => {
    test(`[${format}] runner timeline lists every sent header once, with exact values in source order`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders } = buildCommonLocators(page);
      const runner = buildRunnerLocators(page);

      await openFixtureCollection(page, electronApp, createTmpDir, format);

      await test.step('Expand the collection so its items are loaded, then run it', async () => {
        await expandCollection(page, COLLECTION);
        await runCollection(page, COLLECTION);
      });

      let tableLines: string[] = [];

      await test.step('Runner result -> Timeline -> Request', async () => {
        await openRunnerResultTimeline(page, REQUEST);
        await expect(runner.resultTimelineEntries()).toHaveCount(1);
        await expect(timelineHeaders.table()).toBeVisible();

        tableLines = await assertHeaderTable(timelineHeaders, 'runner Request tab');
      });

      await test.step('Runner result -> Timeline -> Network prints the same lines', async () => {
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
