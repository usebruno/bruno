import { Page } from '../../../playwright';
import { escapeRegExp } from '../helpers';
import { readLastHopRequestHeaderLines } from './network-log';

/**
 * Locators for the read-only headers table rendered inside an expanded timeline
 * entry's Request tab (packages/bruno-app/.../Timeline/TimelineItem/Common/Headers).
 *
 * Header names are matched case-insensitively and anchored: transport defaults
 * (Host / Accept / Connection …) can differ in case on the wire, and anchoring
 * keeps `header-1` from also matching `header-10`.
 */
export const buildTimelineHeaderLocators = (page: Page) => {
  // The request and response tabs of a timeline entry both render the shared Headers table and stay
  // mounted together, so the test ids are namespaced by variant; this targets the Request tab.
  const table = () => page.getByTestId('timeline-detail').getByTestId('tl-headers-table-request');
  const rows = () => table().getByTestId('tl-header-row-request');
  // Header-name cells in render order — for asserting the source ordering of the whole table.
  const names = () => table().getByTestId('tl-header-name-request');
  const row = (name: string) =>
    rows().filter({
      has: page.getByTestId('tl-header-name-request').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`, 'i') })
    });
  const value = (name: string) => row(name).getByTestId('tl-header-value-request');

  // The expanded entry's Network tab: the raw wire trace.
  const networkTab = () => page.getByTestId('timeline-detail').getByTestId('tl-tab-network');
  const lastHopRequestHeaderLines = () => readLastHopRequestHeaderLines(page.getByTestId('timeline-detail'));

  return { table, rows, names, row, value, networkTab, lastHopRequestHeaderLines };
};
