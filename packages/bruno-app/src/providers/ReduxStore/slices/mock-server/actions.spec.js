jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'mock-uid'
}));

import { configureStore } from '@reduxjs/toolkit';
import tabsReducer from 'providers/ReduxStore/slices/tabs';
import { restoreCollectionTabs } from './actions';

const COLLECTION_UID = 'col-1';

const buildStore = (preferences = {}) => configureStore({
  reducer: {
    tabs: tabsReducer,
    app: (state = { preferences }) => state
  }
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

  it('restores saved mock tabs', () => {
    const store = buildStore();

    store.dispatch(restoreCollectionTabs({ collection, tabs: snapshotTabs, activeTab: null }));

    expect(restoredTypes(store)).toEqual(['variables', 'mock-server', 'mock-server', 'mock-response']);
  });
});
