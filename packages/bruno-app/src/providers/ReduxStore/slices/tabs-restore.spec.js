const path = require('path');
const { tabsSlice } = require('./tabs');

const { restoreTabs } = tabsSlice.actions;
const reducer = tabsSlice.reducer;

const p = (...segments) => path.join('/', ...segments);

describe('restoreTabs', () => {
  it('skips remapped .yml request paths when reopening a bru collection', () => {
    const next = reducer(
      { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
      restoreTabs({
        collection: { uid: 'col1', format: 'bru', items: [] },
        tabs: [
          { type: 'http-request', accessor: 'pathname', pathname: p('c', 'ping.yml'), permanent: true },
          { type: 'collection-settings', accessor: 'type', permanent: true },
          { type: 'folder-settings', accessor: 'pathname', pathname: p('c', 'api'), permanent: true }
        ],
        activeTab: null
      })
    );

    expect(next.tabs.map((t) => t.type)).toEqual(['collection-settings', 'folder-settings']);
  });

  it('skips stale .bru request paths when restoring a yml collection', () => {
    const next = reducer(
      { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
      restoreTabs({
        collection: { uid: 'col1', format: 'yml', items: [] },
        tabs: [
          { type: 'http-request', accessor: 'pathname', pathname: p('c', 'ping.bru'), permanent: true },
          { type: 'collection-settings', accessor: 'type', permanent: true }
        ],
        activeTab: null
      })
    );

    expect(next.tabs.map((t) => t.type)).toEqual(['collection-settings']);
  });

  it('does not replace the start page when a collection loads its saved tabs', () => {
    const next = reducer(
      { tabs: [], activeTabUid: null, recentlyClosedTabs: [] },
      restoreTabs({
        collection: { uid: 'col1', format: 'yml', items: [] },
        tabs: [{ type: 'collection-settings', accessor: 'type', permanent: true }],
        activeTab: null
      })
    );

    expect(next.tabs).toHaveLength(1);
    expect(next.activeTabUid).toBeNull();
  });

  it('refocuses the collection when its own active tab was replaced by the restore', () => {
    const next = reducer(
      { tabs: [{ uid: 'col1', collectionUid: 'col1', type: 'collection-settings' }], activeTabUid: 'col1', recentlyClosedTabs: [] },
      restoreTabs({
        collection: { uid: 'col1', format: 'yml', items: [] },
        tabs: [{ type: 'collection-settings', accessor: 'type', permanent: true }],
        activeTab: null
      })
    );

    expect(next.activeTabUid).toBe('col1');
  });
});
