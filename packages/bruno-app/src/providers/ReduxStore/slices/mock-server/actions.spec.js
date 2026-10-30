jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import { configureStore } from '@reduxjs/toolkit';
import tabsReducer, { addTab, closeTabs, reopenLastClosedTab } from 'providers/ReduxStore/slices/tabs';
import { closeDisabledMockServerTabs, restoreCollectionTabs } from './actions';

const COLLECTION_UID = 'col-1';
const MOCK_SERVER_OFF = { beta: { 'mock-server': false } };

const buildStore = (preferences = {}) => configureStore({
  reducer: {
    tabs: tabsReducer,
    app: (state = { preferences }) => state
  }
});

const openTab = (store, uid, type, extra = {}) => store.dispatch(addTab({
  uid,
  collectionUid: COLLECTION_UID,
  type,
  preview: false,
  ...extra
}));

const openTabUids = (store) => store.getState().tabs.tabs.map((tab) => tab.uid);

describe('closeDisabledMockServerTabs', () => {
  it('closes every mock server and mock response tab and leaves other tabs open', () => {
    const store = buildStore(MOCK_SERVER_OFF);
    openTab(store, 'request-1', 'http-request');
    openTab(store, 'mock-server-1', 'mock-server', { mockServerUid: 'mock-server-1' });
    openTab(store, 'mock-response-1', 'mock-response');

    store.dispatch(closeDisabledMockServerTabs());

    expect(openTabUids(store)).toEqual(['request-1']);
  });

  it('keeps closed mock tabs from being reopened, including ones closed by hand earlier', () => {
    const store = buildStore(MOCK_SERVER_OFF);
    openTab(store, 'request-1', 'http-request');
    openTab(store, 'request-2', 'http-request');
    openTab(store, 'mock-response-earlier', 'mock-response');
    store.dispatch(closeTabs({ tabUids: ['request-2'] }));
    store.dispatch(closeTabs({ tabUids: ['mock-response-earlier'] }));
    openTab(store, 'mock-server-1', 'mock-server', { mockServerUid: 'mock-server-1' });

    store.dispatch(closeDisabledMockServerTabs());

    expect(store.getState().tabs.recentlyClosedTabs.map((tab) => tab.uid)).toEqual(['request-2']);
    store.dispatch(reopenLastClosedTab({ collectionUid: COLLECTION_UID }));
    store.dispatch(reopenLastClosedTab({ collectionUid: COLLECTION_UID }));
    expect(openTabUids(store)).toEqual(['request-1', 'request-2']);
  });

  it('purges mock tabs saved under legacy types from the recently closed stack', () => {
    const store = buildStore(MOCK_SERVER_OFF);
    openTab(store, 'request-1', 'http-request');
    openTab(store, 'legacy-dashboard', 'mock-server-dashboard', { mockServerUid: 'mock-server-1' });
    store.dispatch(closeTabs({ tabUids: ['legacy-dashboard'] }));

    store.dispatch(closeDisabledMockServerTabs());

    expect(store.getState().tabs.recentlyClosedTabs).toEqual([]);
  });

  it('leaves tabs untouched when no mock tabs are open or closed', () => {
    const store = buildStore(MOCK_SERVER_OFF);
    openTab(store, 'request-1', 'http-request');
    openTab(store, 'request-2', 'http-request');
    store.dispatch(closeTabs({ tabUids: ['request-2'] }));

    store.dispatch(closeDisabledMockServerTabs());

    expect(openTabUids(store)).toEqual(['request-1']);
    expect(store.getState().tabs.recentlyClosedTabs.map((tab) => tab.uid)).toEqual(['request-2']);
  });

  it('leaves mock tabs open when Mock Server is back on by the time it runs', () => {
    const store = buildStore({ beta: { 'mock-server': true } });
    openTab(store, 'request-1', 'http-request');
    openTab(store, 'mock-server-1', 'mock-server', { mockServerUid: 'mock-server-1' });
    openTab(store, 'mock-response-earlier', 'mock-response');
    store.dispatch(closeTabs({ tabUids: ['mock-response-earlier'] }));

    store.dispatch(closeDisabledMockServerTabs());

    expect(openTabUids(store)).toEqual(['request-1', 'mock-server-1']);
    expect(store.getState().tabs.recentlyClosedTabs.map((tab) => tab.uid)).toEqual(['mock-response-earlier']);
  });
});

describe('restoreCollectionTabs', () => {
  const collection = { uid: COLLECTION_UID, pathname: '/collections/demo', format: 'yml' };
  const snapshotTabs = [
    { type: 'variables', accessor: 'type', permanent: true },
    { type: 'mock-server', mockServerUid: 'mock-server-1', name: 'Dog API', permanent: true },
    { type: 'mock-server-dashboard', mockServerUid: 'mock-server-2', permanent: true },
    { type: 'mock-response', mockServerUid: 'mock-server-1', responseUid: 'mock-response-1', name: 'Get dog', permanent: true }
  ];

  const restoredTypes = (store) => store.getState().tabs.tabs.map((tab) => tab.type);

  it('drops saved mock server and mock response tabs when the feature is off', () => {
    const store = buildStore({ beta: { 'mock-server': false } });

    store.dispatch(restoreCollectionTabs({ collection, tabs: snapshotTabs, activeTab: null }));

    expect(restoredTypes(store)).toEqual(['variables']);
  });

  it('restores saved mock tabs when the feature is on', () => {
    const store = buildStore({ beta: { 'mock-server': true } });

    store.dispatch(restoreCollectionTabs({ collection, tabs: snapshotTabs, activeTab: null }));

    expect(restoredTypes(store)).toEqual(['variables', 'mock-server', 'mock-server', 'mock-response']);
  });

  it('keeps saved mock tabs while preferences are not loaded yet', () => {
    const store = buildStore();

    store.dispatch(restoreCollectionTabs({ collection, tabs: snapshotTabs, activeTab: null }));

    expect(restoredTypes(store)).toEqual(['variables', 'mock-server', 'mock-server', 'mock-response']);
  });
});
