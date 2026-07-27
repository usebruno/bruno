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
  const table = () => page.getByTestId('timeline-detail').getByTestId('tl-headers-table');
  const rows = () => table().getByTestId('tl-header-row');
  const row = (name: string) =>
    rows().filter({
      has: page.getByTestId('tl-header-name').filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`, 'i') })
    });
  const value = (name: string) => row(name).getByTestId('tl-header-value');
  return { table, rows, row, value };
};
