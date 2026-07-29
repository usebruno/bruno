import { Page } from '../../../playwright';
import { escapeRegExp } from '../helpers';

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
  const networkLogEntries = () => page.getByTestId('timeline-detail').getByTestId('network-log-entry');

  /**
   * The final hop's sent headers from the network log, as "name: value" strings in wire order.
   *
   * Scoped to the last hop deliberately: a followed redirect (or a digest/NTLM retry) logs every hop
   * here, while the Request tab's table shows only the hop that produced the response. Comparing the
   * two therefore has to start at the last `request` marker, or a multi-hop request looks like a
   * mismatch when the views actually agree.
   */
  const lastHopRequestHeaderLines = async () => {
    const entries = await networkLogEntries().evaluateAll((nodes) =>
      nodes.map((node) => ({
        type: node.getAttribute('data-log-type'),
        text: (node.textContent || '').trim()
      }))
    );
    const hopStart = entries.reduce((last, entry, i) => (entry.type === 'request' ? i : last), 0);
    return entries.slice(hopStart).filter((e) => e.type === 'requestHeader').map((e) => e.text);
  };

  return { table, rows, names, row, value, networkTab, lastHopRequestHeaderLines };
};
