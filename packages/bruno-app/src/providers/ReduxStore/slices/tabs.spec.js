import reducer, { addTab, restoreTabs } from 'providers/ReduxStore/slices/tabs';

const COLLECTION_UID = 'col-1';
const MOCK_SERVER_UID = 'mock-server-1';

const makeCollection = () => ({
  uid: COLLECTION_UID,
  pathname: '/workspace/collections/demo'
});

describe('tabs mocker dedup', () => {
  it('addTab focuses existing mocker tab for the same mockServerUid', () => {
    let state = reducer(undefined, addTab({
      uid: MOCK_SERVER_UID,
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mocker'
    }));

    state = reducer(state, addTab({
      uid: 'other-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mocker'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].uid).toBe(MOCK_SERVER_UID);
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('addTab focuses legacy mock-server-dashboard tab and migrates type to mocker', () => {
    const legacyState = {
      tabs: [{
        uid: MOCK_SERVER_UID,
        collectionUid: COLLECTION_UID,
        mockServerUid: MOCK_SERVER_UID,
        type: 'mock-server-dashboard',
        tabName: 'Dog API'
      }],
      activeTabUid: null,
      recentlyClosedTabs: []
    };

    const state = reducer(legacyState, addTab({
      uid: 'new-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mocker'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].type).toBe('mocker');
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('restoreTabs skips duplicate mocker snapshots for the same mockServerUid', () => {
    const collection = makeCollection();
    const snapshotTabs = [
      { type: 'mocker', mockServerUid: MOCK_SERVER_UID, name: 'Dog API', permanent: true },
      { type: 'mocker', mockServerUid: MOCK_SERVER_UID, name: 'Dog API copy', permanent: true }
    ];

    const state = reducer(undefined, restoreTabs({
      collection,
      tabs: snapshotTabs,
      activeTab: { accessor: 'type::mockServerUid', value: MOCK_SERVER_UID }
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].mockServerUid).toBe(MOCK_SERVER_UID);
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });
});
