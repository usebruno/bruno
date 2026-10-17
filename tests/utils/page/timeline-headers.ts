import { Page } from '../../../playwright';
import { escapeRegExp } from '../helpers';
import { readLastHopRequestHeaderLines, readRequestHops } from './network-log';

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
