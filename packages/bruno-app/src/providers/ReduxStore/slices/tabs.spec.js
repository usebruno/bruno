import { configureStore } from '@reduxjs/toolkit';
import tabsReducer, { addTab, focusTab, closeTabs, closeAllCollectionTabs, switchTab, reopenLastClosedTab } from './tabs';

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

  it('should filter out the replaced preview tab from history', () => {
    store.dispatch(addTab({ uid: 'preview1', collectionUid: 'c1', type: 'request', preview: true }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['preview1']);

    // Adding a second tab which will replace the preview tab
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab2']);
    expect(store.getState().tabs.tabs.map((t) => t.uid)).toEqual(['tab2']);
  });

  it('should update history when using switchTab', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab3', collectionUid: 'c1', type: 'request', preview: false }));

    expect(store.getState().tabs.activeTabHistory).toEqual(['tab3', 'tab2', 'tab1']);

    store.dispatch(switchTab({ direction: 'pagedown' })); // Points to tab1 (circular from tab3)
    expect(store.getState().tabs.activeTabUid).toBe('tab1');
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab1', 'tab3', 'tab2']);
  });

  it('should restore history when using reopenLastClosedTab', () => {
    store.dispatch(addTab({ uid: 'tab1', collectionUid: 'c1', type: 'request', preview: false }));
    store.dispatch(addTab({ uid: 'tab2', collectionUid: 'c1', type: 'request', preview: false }));

    store.dispatch(closeTabs({ tabUids: ['tab2'] }));
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab1']);

    store.dispatch(reopenLastClosedTab());
    expect(store.getState().tabs.activeTabUid).toBe('tab2');
    expect(store.getState().tabs.activeTabHistory).toEqual(['tab2', 'tab1']);
  });
});
