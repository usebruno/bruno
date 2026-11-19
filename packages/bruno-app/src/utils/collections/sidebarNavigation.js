import { isCollectionItemCollapsed } from './index';

/**
 * Returns the stable identity used to focus a sidebar row.
 * Collection and item uids are not enough on their own because the empty-state
 * CTA shares the collection uid and examples share their request uid.
 */
export const getRowFocusKey = (row) => {
  if (!row) return null;
  if (row.kind === 'example') return row.exampleUid || row.id;
  if (row.kind === 'empty-cta' || row.kind === 'ghost') return row.id;
  return row.itemUid || row.collectionUid || row.id;
};

export const findRowIndexByFocusKey = (rows, focusKey) =>
  rows.findIndex((row) => getRowFocusKey(row) === focusKey);

/**
 * Moves one visible row up or down. Unlike a roving menu this does not wrap:
 * reaching the first or last row keeps focus where it is.
 */
export const getNextRowIndex = (rows, currentIndex, direction) => {
  if (!rows.length) return -1;
  if (currentIndex < 0) return direction > 0 ? 0 : rows.length - 1;

  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < rows.length ? nextIndex : currentIndex;
};

/**
 * Finds the row that owns the current row in the tree. The flat list carries
 * depth, so the parent is the closest previous row one level shallower.
 */
export const getParentRowIndex = (rows, currentIndex) => {
  const currentRow = rows[currentIndex];
  if (!currentRow || currentRow.depth === 0) return -1;

  for (let index = currentIndex - 1; index >= 0; index--) {
    if (rows[index].depth < currentRow.depth) return index;
  }

  return -1;
};

/**
 * The first child is always the next visible row when the row is expanded,
 * because children are emitted immediately after their parent.
 */
export const getFirstChildRowIndex = (rows, currentIndex) => {
  const currentRow = rows[currentIndex];
  const nextRow = rows[currentIndex + 1];
  if (!currentRow || !nextRow) return -1;
  return nextRow.depth > currentRow.depth ? currentIndex + 1 : -1;
};

export const isRowExpandable = ({ row, item, collection }) => {
  if (row.kind === 'collection') return Boolean(collection);
  if (row.kind === 'folder') return Boolean(item);
  // Only HTTP requests render example rows (see flattenSidebarTree), so other
  // request types must not toggle an expansion that has no visible children.
  if (row.kind === 'request') return item?.type === 'http-request' && Boolean(item?.examples?.length);
  return false;
};

/**
 * True when the row is fully inside the virtualized scroller. Off-screen rows
 * have to be scrolled into view before focus can be applied reliably.
 */
export const isElementVisibleInScroller = (scroller, element) => {
  if (!scroller || !element) return false;

  const rowTop = element.offsetTop - scroller.scrollTop;
  return rowTop >= 0 && rowTop + element.offsetHeight <= scroller.clientHeight;
};

const TAB_TYPES_WITH_SIDEBAR_ROW = new Set([
  'request',
  'http-request',
  'graphql-request',
  'grpc-request',
  'ws-request',
  'collection-settings',
  'folder-settings',
  'response-example'
]);

/**
 * Some tabs (workspace overview, environments, collection runner, API specs)
 * have no row in the collections tree, so focusing them falls back to the first
 * visible row instead of waiting for a row that will never appear.
 */
export const doesTabHaveSidebarRow = (tab) =>
  Boolean(tab?.collectionUid) && TAB_TYPES_WITH_SIDEBAR_ROW.has(tab.type);

export const isRowExpanded = ({ row, item, collection }) => {
  if (row.kind === 'collection') return Boolean(collection) && !collection.collapsed;
  if (row.kind === 'folder' || row.kind === 'request') return Boolean(item) && !isCollectionItemCollapsed(item);
  return false;
};
