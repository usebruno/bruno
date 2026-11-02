import { Locator, Page } from '../../playwright';
import { escapeRegExp } from '../../support/helpers';
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
  networkButton: (item: Locator) => item.getByRole('button', { name: 'Network' }),
  networkLogs: (item: Locator) => item.locator('.network-logs-container'),
  headerRow: (item: Locator, name: string) => buildTimelineHeaderRow(page, item, name),
  headerValue: (item: Locator, name: string) =>
    buildTimelineHeaderRow(page, item, name).getByTestId('tl-header-value-request')
});
