const {
  doesTabHaveSidebarRow,
  findRowIndexByFocusKey,
  getFirstChildRowIndex,
  getNextRowIndex,
  getParentRowIndex,
  getRowFocusKey,
  isElementVisibleInScroller,
  isRowExpandable,
  isRowExpanded
} = require('./sidebarNavigation');

const rows = [
  { id: 'col:collection-1', kind: 'collection', depth: 0, collectionUid: 'collection-1', itemUid: null },
  { id: 'folder-row', kind: 'folder', depth: 1, collectionUid: 'collection-1', itemUid: 'folder-1' },
  { id: 'request-row', kind: 'request', depth: 2, collectionUid: 'collection-1', itemUid: 'request-1' },
  { id: 'example-row', kind: 'example', depth: 3, collectionUid: 'collection-1', itemUid: 'request-1', exampleUid: 'example-1' },
  { id: 'cta-row', kind: 'empty-cta', depth: 1, collectionUid: 'collection-1', itemUid: null }
];

describe('sidebarNavigation', () => {
  describe('getRowFocusKey', () => {
    it('uses the example uid for example rows', () => {
      expect(getRowFocusKey(rows[3])).toBe('example-1');
    });

    it('uses the collection uid for collection rows and the row id for the CTA', () => {
      expect(getRowFocusKey(rows[0])).toBe('collection-1');
      expect(getRowFocusKey(rows[4])).toBe('cta-row');
    });
  });

  describe('findRowIndexByFocusKey', () => {
    it('finds a row by its focus key', () => {
      expect(findRowIndexByFocusKey(rows, 'example-1')).toBe(3);
      expect(findRowIndexByFocusKey(rows, 'missing')).toBe(-1);
    });
  });

  describe('getNextRowIndex', () => {
    it('moves to the next and previous visible row', () => {
      expect(getNextRowIndex(rows, 1, 1)).toBe(2);
      expect(getNextRowIndex(rows, 2, -1)).toBe(1);
    });

    it('starts at the first or last row when nothing is focused', () => {
      expect(getNextRowIndex(rows, -1, 1)).toBe(0);
      expect(getNextRowIndex(rows, -1, -1)).toBe(rows.length - 1);
    });

    it('does not wrap at the edges', () => {
      expect(getNextRowIndex(rows, 0, -1)).toBe(0);
      expect(getNextRowIndex(rows, rows.length - 1, 1)).toBe(rows.length - 1);
    });
  });

  describe('getParentRowIndex', () => {
    it('walks up the folder hierarchy using row depth', () => {
      expect(getParentRowIndex(rows, 3)).toBe(2);
      expect(getParentRowIndex(rows, 2)).toBe(1);
      expect(getParentRowIndex(rows, 1)).toBe(0);
    });

    it('does not return a parent for collections', () => {
      expect(getParentRowIndex(rows, 0)).toBe(-1);
    });
  });

  describe('getFirstChildRowIndex', () => {
    it('returns the immediately following row when it is deeper', () => {
      expect(getFirstChildRowIndex(rows, 0)).toBe(1);
      expect(getFirstChildRowIndex(rows, 1)).toBe(2);
      expect(getFirstChildRowIndex(rows, 2)).toBe(3);
    });

    it('returns -1 for leaves', () => {
      expect(getFirstChildRowIndex(rows, 3)).toBe(-1);
      expect(getFirstChildRowIndex(rows, 4)).toBe(-1);
    });
  });

  describe('expansion helpers', () => {
    it('treats collections and folders as expandable', () => {
      expect(isRowExpandable({ row: rows[0], collection: { collapsed: false } })).toBe(true);
      expect(isRowExpandable({ row: rows[1], item: { type: 'folder' } })).toBe(true);
    });

    it('treats only requests with examples as expandable', () => {
      expect(isRowExpandable({ row: rows[2], item: { type: 'http-request', examples: [{}] } })).toBe(true);
      expect(isRowExpandable({ row: rows[2], item: { type: 'http-request', examples: [] } })).toBe(false);
    });

    it('does not treat non-HTTP requests with examples as expandable', () => {
      expect(isRowExpandable({ row: rows[2], item: { type: 'graphql-request', examples: [{}] } })).toBe(false);
      expect(isRowExpandable({ row: rows[2], item: { type: 'grpc-request', examples: [{}] } })).toBe(false);
    });

    it('derives expanded state from the collection or item', () => {
      expect(isRowExpanded({ row: rows[0], collection: { collapsed: false } })).toBe(true);
      expect(isRowExpanded({ row: rows[0], collection: { collapsed: true } })).toBe(false);
      expect(isRowExpanded({ row: rows[1], item: { collapsed: false } })).toBe(true);
      expect(isRowExpanded({ row: rows[2], item: { collapsed: false } })).toBe(true);
      expect(isRowExpanded({ row: rows[2], item: { collapsed: true } })).toBe(false);
    });
  });

  describe('doesTabHaveSidebarRow', () => {
    it('recognizes tabs backed by a sidebar row', () => {
      expect(doesTabHaveSidebarRow({ collectionUid: 'c1', type: 'http-request' })).toBe(true);
      expect(doesTabHaveSidebarRow({ collectionUid: 'c1', type: 'collection-settings' })).toBe(true);
      expect(doesTabHaveSidebarRow({ collectionUid: 'c1', type: 'response-example' })).toBe(true);
    });

    it('rejects tabs and collections that have no row in the tree', () => {
      expect(doesTabHaveSidebarRow({ collectionUid: 'c1', type: 'workspaceOverview' })).toBe(false);
      expect(doesTabHaveSidebarRow({ collectionUid: 'c1', type: 'collection-runner' })).toBe(false);
      expect(doesTabHaveSidebarRow({ type: 'http-request' })).toBe(false);
      expect(doesTabHaveSidebarRow(null)).toBe(false);
    });
  });

  describe('isElementVisibleInScroller', () => {
    const scroller = { scrollTop: 100, clientHeight: 200 };

    it('accepts rows fully inside the viewport', () => {
      expect(isElementVisibleInScroller(scroller, { offsetTop: 120, offsetHeight: 20 })).toBe(true);
    });

    it('rejects rows that are clipped by either edge', () => {
      expect(isElementVisibleInScroller(scroller, { offsetTop: 80, offsetHeight: 20 })).toBe(false);
      expect(isElementVisibleInScroller(scroller, { offsetTop: 290, offsetHeight: 20 })).toBe(false);
    });

    it('rejects missing elements', () => {
      expect(isElementVisibleInScroller(scroller, null)).toBe(false);
      expect(isElementVisibleInScroller(null, { offsetTop: 120, offsetHeight: 20 })).toBe(false);
    });
  });
});
