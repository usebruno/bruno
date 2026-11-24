import { test, Locator, Page } from '../../playwright';
import { escapeRegExp } from '../../utils/helpers';
import { readLastHopRequestHeaderLines, readRequestHops } from '../app-shell/network-log';

export const buildTimelineHeaderLocators = (page: Page) => {
  // The request and response tabs of a timeline entry both render the shared Headers table and stay
  // mounted together, so the test ids are namespaced by variant; this targets the Request tab.
  const table = () => page.getByTestId('timeline-detail').getByTestId('tl-headers-table-request');
  const rows = () => table().getByTestId('tl-header-row-request');
  const names = () => table().getByTestId('tl-header-name-request');
  const values = () => table().getByTestId('tl-header-value-request');

  /** Every row as a "name: value" line in render order, matching how the network log prints them. */
  const headerLines = async () => {
    const [rowNames, rowValues] = await Promise.all([names().allTextContents(), values().allTextContents()]);
    return rowNames.map((name, i) => `${name.trim()}: ${(rowValues[i] ?? '').trim()}`);
  };
  const row = (name: string) =>
    rows().filter({
      has: page.getByTestId('tl-header-name-request').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`, 'i') })
    });
  const value = (name: string) => row(name).getByTestId('tl-header-value-request');

  // The expanded entry's Network tab: the raw wire trace.
  const networkTab = () => page.getByTestId('timeline-detail').getByTestId('tl-tab-network');
  const lastHopRequestHeaderLines = () => readLastHopRequestHeaderLines(page.getByTestId('timeline-detail'));
  const requestHops = () => readRequestHops(page.getByTestId('timeline-detail'));

  return { table, rows, headerLines, row, value, networkTab, lastHopRequestHeaderLines, requestHops };
};

/** Row kind, from its badge: your request, a sendRequest call, a runRequest call, or an OAuth2 token fetch. */
type TimelineEntryKind = 'main' | 'pre' | 'post' | 'oauth';

const buildTimelineHeaderRow = (page: Page, item: Locator, name: string) =>
  item.getByTestId('tl-header-row-request').filter({
    has: page.getByTestId('tl-header-name-request').and(page.getByText(name, { exact: true }))
  });

/**
 * Locators for the request timeline (items, network logs, header rows).
 */
export const buildTimelineLocators = (page: Page) => ({
  items: () => page.getByTestId('timeline-item'),
  lastItem: () => page.getByTestId('timeline-item').last(),
  itemHeader: (item: Locator) => item.getByTestId('timeline-item-header'),
  clearButton: () => page.getByRole('button', { name: 'Clear Timeline' }),
  container: () => page.getByTestId('timeline-container'),
  entries: () => page.getByTestId('timeline-container').getByTestId('timeline-entry'),
  entriesOfKind: (kind: TimelineEntryKind) =>
    page.getByTestId('timeline-container').getByTestId('timeline-entry')
      .filter({ has: page.getByTestId(`timeline-badge-${kind}`) }),
  entryBadge: (entry: Locator, kind: TimelineEntryKind) => entry.getByTestId(`timeline-badge-${kind}`),
  entryUrl: (entry: Locator) => entry.getByTestId('timeline-url'),
  entryMethod: (entry: Locator) => entry.getByTestId('timeline-method'),
  entryStatus: (entry: Locator) => entry.getByTestId('timeline-status'),
  entryResponseTab: (entry: Locator) => entry.getByTestId('tl-tab-response'),
  entryResponseNoBody: (entry: Locator) => entry.getByTestId('timeline-response-no-body'),
  entryDetail: (entry: Locator) => entry.getByTestId('timeline-detail'),
  entryDetailUrl: (entry: Locator) => entry.getByTestId('timeline-detail-url'),
  entryNetworkTab: (entry: Locator) => entry.getByTestId('tl-tab-network'),
  entryErrorLogs: (entry: Locator) =>
    entry.getByTestId('network-log-entry').and(page.locator('[data-log-type="error"]')),
  networkButton: (item: Locator) => item.getByRole('button', { name: 'Network' }),
  networkLogs: (item: Locator) => item.locator('.network-logs-container'),
  headerRow: (item: Locator, name: string) => buildTimelineHeaderRow(page, item, name),
  headerValue: (item: Locator, name: string) =>
    buildTimelineHeaderRow(page, item, name).getByTestId('tl-header-value-request')
});

/**
 * Expand a Timeline entry so its detail (URL header and Request/Response/Network tabs) is shown.
 * @param page - The page object
 * @param entry - A Timeline entry locator, e.g. from `timeline.entriesOfKind('main')`
 */
export const expandTimelineEntry = async (page: Page, entry: Locator) => {
  await test.step('Expand the Timeline entry', async () => {
    const timeline = buildTimelineLocators(page);
    await timeline.itemHeader(entry).click();
    await timeline.entryDetail(entry).waitFor({ state: 'visible' });
  });
};

/**
 * Expand a Timeline entry and switch its detail to the Response tab.
 * @param page - The page object
 * @param entry - A Timeline entry locator, e.g. from `timeline.entriesOfKind('pre')`
 */
export const openTimelineEntryResponse = async (page: Page, entry: Locator) => {
  await test.step('Open the Timeline entry\'s Response tab', async () => {
    const timeline = buildTimelineLocators(page);
    await expandTimelineEntry(page, entry);
    await timeline.entryResponseTab(entry).click();
    // The Request tab stays mounted (hidden) beside it, so wait on the visible Body block.
    await entry.getByTestId('response-body-toggle').filter({ visible: true }).first().waitFor({ state: 'visible' });
  });
};

/**
 * Expand a Timeline entry and switch its detail to the Network tab (the raw wire trace).
 * @param page - The page object
 * @param entry - A Timeline entry locator, e.g. from `timeline.entriesOfKind('post')`
 */
export const openTimelineEntryNetworkLogs = async (page: Page, entry: Locator) => {
  await test.step('Open the Timeline entry\'s Network logs', async () => {
    const timeline = buildTimelineLocators(page);
    await expandTimelineEntry(page, entry);
    await timeline.entryNetworkTab(entry).click();
    // The log opens with an empty, never-visible separator entry, so wait on the first visible one.
    await entry.getByTestId('network-log-entry').filter({ visible: true }).first().waitFor({ state: 'visible' });
  });
};
