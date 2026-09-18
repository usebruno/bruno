import reducer, { addTab, restoreTabs, closeTabs } from 'providers/ReduxStore/slices/tabs';
import { getApiSpecTabUid } from 'utils/api-specs';

const COLLECTION_UID = 'col-1';
const MOCK_SERVER_UID = 'mock-server-1';
const PETSTORE_PATH = '/workspace/petstore.yaml';
const ORDERS_PATH = '/workspace/orders.yaml';
const OTHER_COLLECTION_UID = 'col-2';

const openApiSpecTab = (state, pathname, tabName, collectionUid = COLLECTION_UID) => reducer(state, addTab({
  uid: getApiSpecTabUid(collectionUid, pathname),
  collectionUid,
  type: 'api-spec',
  apiSpecPathname: pathname,
  tabName
}));

const makeCollection = () => ({
  uid: COLLECTION_UID,
  pathname: '/workspace/collections/demo'
});

describe('tabs mock-server dedup', () => {
  it('addTab focuses existing mock-server tab for the same mockServerUid', () => {
    let state = reducer(undefined, addTab({
      uid: MOCK_SERVER_UID,
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    state = reducer(state, addTab({
      uid: 'other-uid',
      collectionUid: COLLECTION_UID,
      mockServerUid: MOCK_SERVER_UID,
      tabName: 'Dog API',
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].uid).toBe(MOCK_SERVER_UID);
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('addTab focuses legacy mock-server-dashboard tab and migrates type to mock-server', () => {
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
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].type).toBe('mock-server');
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('addTab focuses legacy mocker tab and migrates type to mock-server', () => {
    const legacyState = {
      tabs: [{
        uid: MOCK_SERVER_UID,
        collectionUid: COLLECTION_UID,
        mockServerUid: MOCK_SERVER_UID,
        type: 'mocker',
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
      type: 'mock-server'
    }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].type).toBe('mock-server');
    expect(state.activeTabUid).toBe(MOCK_SERVER_UID);
  });

  it('restoreTabs skips duplicate mock-server snapshots for the same mockServerUid', () => {
    const collection = makeCollection();
    const snapshotTabs = [
      { type: 'mock-server', mockServerUid: MOCK_SERVER_UID, name: 'Dog API', permanent: true },
      { type: 'mock-server', mockServerUid: MOCK_SERVER_UID, name: 'Dog API copy', permanent: true }
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

describe('API spec tabs', () => {
  it('opens a second spec alongside the first instead of replacing it', () => {
    let state = openApiSpecTab(undefined, PETSTORE_PATH, 'petstore.yaml');
    state = openApiSpecTab(state, ORDERS_PATH, 'orders.yaml');

    expect(state.tabs).toHaveLength(2);
    expect(state.tabs.map((tab) => tab.apiSpecPathname)).toEqual([PETSTORE_PATH, ORDERS_PATH]);
    expect(state.activeTabUid).toBe(getApiSpecTabUid(COLLECTION_UID, ORDERS_PATH));
  });

  it('goes back to the tab a spec already has instead of opening it twice', () => {
    let state = openApiSpecTab(undefined, PETSTORE_PATH, 'petstore.yaml');
    state = openApiSpecTab(state, ORDERS_PATH, 'orders.yaml');
    state = openApiSpecTab(state, PETSTORE_PATH, 'petstore.yaml');

    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabUid).toBe(getApiSpecTabUid(COLLECTION_UID, PETSTORE_PATH));
  });

  it('opens the spec as a permanent tab, so opening another one does not replace it', () => {
    const state = openApiSpecTab(undefined, PETSTORE_PATH, 'petstore.yaml');

    expect(state.tabs[0].preview).toBe(false);
  });

  it('gives each workspace its own tab for a spec the two workspaces share', () => {
    let state = openApiSpecTab(undefined, PETSTORE_PATH, 'petstore.yaml');
    state = openApiSpecTab(state, PETSTORE_PATH, 'petstore.yaml', OTHER_COLLECTION_UID);

    expect(state.tabs).toHaveLength(2);
    expect(state.tabs.map((tab) => tab.collectionUid)).toEqual([COLLECTION_UID, OTHER_COLLECTION_UID]);
    expect(state.activeTabUid).toBe(getApiSpecTabUid(OTHER_COLLECTION_UID, PETSTORE_PATH));
  });

  it('closes a spec tab without touching the other one', () => {
    let state = openApiSpecTab(undefined, PETSTORE_PATH, 'petstore.yaml');
    state = openApiSpecTab(state, ORDERS_PATH, 'orders.yaml');

    state = reducer(state, closeTabs({ tabUids: [getApiSpecTabUid(COLLECTION_UID, PETSTORE_PATH)] }));

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].apiSpecPathname).toBe(ORDERS_PATH);
  });
});
