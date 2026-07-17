const path = require('path');
const { tabsSlice } = require('./tabs');

const { restoreTabs } = tabsSlice.actions;
const reducer = tabsSlice.reducer;

const p = (...parts) => path.join(...parts);

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

  it('does not wipe open tabs when every snapshot tab is stale for the collection format', () => {
    const next = reducer(
      {
        tabs: [{ uid: 'col1', collectionUid: 'col1', type: 'collection-settings' }],
        activeTabUid: 'col1',
        recentlyClosedTabs: []
      },
      restoreTabs({
        collection: { uid: 'col1', format: 'bru', items: [] },
        tabs: [
          { type: 'http-request', accessor: 'pathname', pathname: p('c', 'ping.yml'), permanent: true }
        ],
        activeTab: { accessor: 'pathname', value: p('c', 'ping.yml') }
      })
    );

    expect(next.tabs).toEqual([
      { uid: 'col1', collectionUid: 'col1', type: 'collection-settings' }
    ]);
    expect(next.activeTabUid).toBe('col1');
  });
});
