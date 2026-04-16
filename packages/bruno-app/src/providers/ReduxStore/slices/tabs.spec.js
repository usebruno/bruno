import { configureStore } from '@reduxjs/toolkit';
import tabsReducer, { addTab, focusTab, closeTabs, closeAllCollectionTabs } from './tabs';

describe('tabs reducer with store', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        tabs: tabsReducer
      }
    });
  });

  it('should update activeTabHistory when adding a tab', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab1']);

    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab2', 'tab1']);
  });

  it('should move tab to front of history when focusing an existing tab', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab3', collectionUid: 'c1', type: 'request', preview: false }));

    expect(store.getState().tabs.activeTabHistory).toEqual(['tab3', 'tab2', 'tab1']);

    store.dispatch(focusTab({ uid: 'tab1' }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab1', 'tab3', 'tab2']);
  });

  it('should remove tab from history when closed', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab3', collectionUid: 'c1', type: 'request', preview: false }));

    store.dispatch(closeTabs({ tabUids: ['tab2'] }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab3', 'tab1']);
    expect(store.getState().tabs.tabs.map((t) => t.uid)).toEqual(['tab1', 'tab3']);
  });

  it('should remove all collection tabs from history when collection is closed', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c2', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab3', collectionUid: 'c1', type: 'request', preview: false }));

    store.dispatch(closeAllCollectionTabs({ collectionUid: 'c1' }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab2']);
    expect(store.getState().tabs.tabs.map((t) => t.uid)).toEqual(['tab2']);
  });

  it('should handle adding a tab that already exists by moving it to front of history', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));

    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab1', 'tab2']);
  });
});
