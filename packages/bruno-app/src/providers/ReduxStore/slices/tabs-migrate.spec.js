const path = require('path');
const { tabsSlice } = require('./tabs');

const { migrateCollectionTabsToYml, restoreTabs } = tabsSlice.actions;
const reducer = tabsSlice.reducer;

const p = (...parts) => path.join(...parts);

const makeState = () => ({
  tabs: [
    { uid: 'r1', collectionUid: 'col1', type: 'http-request', pathname: p('c', 'ping.bru') },
    { uid: 'r2', collectionUid: 'col1', type: 'http-request', pathname: p('c', 'api', 'users.bru') },
    { uid: 'fs1', collectionUid: 'col1', type: 'folder-settings', pathname: p('c', 'api') },
    { uid: 'cs1', collectionUid: 'col1', type: 'collection-settings' },
    { uid: 'other', collectionUid: 'col2', type: 'http-request', pathname: p('c2', 'req.bru') }
  ],
  activeTabUid: 'r1'
});

describe('migrateCollectionTabsToYml', () => {
  it('rewrites .bru -> .yml only for tabs of the given collection', () => {
    const next = reducer(makeState(), migrateCollectionTabsToYml({ collectionUid: 'col1' }));
    const byUid = (uid) => next.tabs.find((t) => t.uid === uid);

    expect(byUid('r1').pathname).toBe(p('c', 'ping.yml'));
    expect(byUid('r2').pathname).toBe(p('c', 'api', 'users.yml'));
    expect(byUid('other').pathname).toBe(p('c2', 'req.bru'));
  });

  it('leaves folder-settings (directory) paths and tabs without a pathname untouched', () => {
    const next = reducer(makeState(), migrateCollectionTabsToYml({ collectionUid: 'col1' }));
    const byUid = (uid) => next.tabs.find((t) => t.uid === uid);

    expect(byUid('fs1').pathname).toBe(p('c', 'api'));
    expect(byUid('cs1').pathname).toBeUndefined();
  });

  it('does not change tab uids or the active tab', () => {
    const next = reducer(makeState(), migrateCollectionTabsToYml({ collectionUid: 'col1' }));
    expect(next.tabs.map((t) => t.uid)).toEqual(['r1', 'r2', 'fs1', 'cs1', 'other']);
    expect(next.activeTabUid).toBe('r1');
  });
});

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
