import fs from 'fs';
import path from 'path';
import { expect, test } from '../../../playwright';
import { closeAllCollections, selectResponsePaneTab, sendRequestAndWaitForResponse } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';
import { openCollectionFromPath, waitForCollectionMount } from '../../utils/page/mounting';

/**
 * The response-timeline Request tab lists every header actually sent, grouped by source:
 * default (transport) -> collection -> folder -> request -> script. This exercises all
 * entities at once — collection/folder/request settings headers plus headers set from
 * pre-request scripts (req.setHeader and the array form of req.setHeaders) at collection,
 * two nested folders, and request level — then asserts each header's exact value in the
 * timeline, including the transport defaults added on the wire (accept, user-agent,
 * accept-encoding, host, connection, request-start-time).
 *
 * Fixtures under fixtures/collections/{bru,yml} declare the identical collection in both
 * on-disk formats; the suite runs once per format so behaviour stays in lockstep.
 */

const COLLECTION = 'timeline-headers';
const REQUEST = 'get-headers';

// Transport/"default" headers Bruno + axios add on the wire (not part of any definition).
// They only reach the timeline via the network-log backfill, so they're the regression-prone set —
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
// scripts (req.setHeader for …-1, the array form req.setHeaders([{…}]) for …-2). All exact, and
// numbered so each row is unambiguous.
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

const ALL_HEADERS = DEFAULT_HEADERS.length + ENTITY_HEADERS.length;

const fixtureFor = (format: 'bru' | 'yml') => path.join(__dirname, 'fixtures', 'collections', format);

test.describe('Timeline — response headers by source', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  const runFor = (format: 'bru' | 'yml') => {
    test(`[${format}] lists every sent header (default / collection / folder / request / script) with exact values`, async ({ page, electronApp, createTmpDir }) => {
      const { timelineHeaders, timeline, sidebar, tabs } = buildCommonLocators(page);

      await test.step('Open the fixture collection (headers + scripts at collection, nested folders, and request)', async () => {
        const collectionDir = await createTmpDir(`${COLLECTION}-${format}`);
        fs.cpSync(fixtureFor(format), collectionDir, { recursive: true });
        await openCollectionFromPath(page, electronApp, collectionDir);
        await waitForCollectionMount(page, COLLECTION);
      });

      await test.step('Reveal and open the request nested in folder-1/folder-2', async () => {
        // Expand each level only if its child isn't already visible — tolerant of whether the
        // freshly-opened collection auto-expands.
        const folder1 = sidebar.folder('folder-1');
        const folder2 = sidebar.folder('folder-2');
        const request = sidebar.request(REQUEST);

        if (!(await folder1.isVisible().catch(() => false))) {
          await sidebar.collection(COLLECTION).click();
          await expect(folder1).toBeVisible();
        }
        if (!(await folder2.isVisible().catch(() => false))) {
          await folder1.click();
          await expect(folder2).toBeVisible();
        }
        if (!(await request.isVisible().catch(() => false))) {
          await folder2.click();
          await expect(request).toBeVisible();
        }
        await request.click();
        await expect(tabs.activeRequestTab()).toContainText(REQUEST);
      });

      await test.step('Send the request', async () => {
        await sendRequestAndWaitForResponse(page, 200);
      });

      await test.step('Open the Timeline and expand its single entry', async () => {
        await selectResponsePaneTab(page, 'Timeline');
        // Pre-request scripts mutate headers but do not create their own entries — only the main request does.
        await expect(timeline.items()).toHaveCount(1);
        await timeline.itemHeader(timeline.items().first()).click();
        await expect(timelineHeaders.table()).toBeVisible();
      });

      await test.step('The Headers table holds exactly the expected set — nothing missing or extra', async () => {
        await expect(timelineHeaders.rows()).toHaveCount(ALL_HEADERS);
      });

      await test.step('All transport default headers are present with the expected values', async () => {
        for (const { name, value, pattern } of DEFAULT_HEADERS) {
          // Present exactly once (the row must exist — not merely be a substring of another).
          await expect(timelineHeaders.row(name), `default header "${name}"`).toHaveCount(1);
          await expect(timelineHeaders.value(name), `default header "${name}"`).toHaveText(value ?? pattern!);
        }
      });

      await test.step('Every configured header (collection / folder / request / script) shows its exact value', async () => {
        for (const [name, value] of ENTITY_HEADERS) {
          await expect(timelineHeaders.value(name), `header "${name}"`).toHaveText(value);
        }
      });
    });
  };

  runFor('bru');
  runFor('yml');
});
