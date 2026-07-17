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
});
