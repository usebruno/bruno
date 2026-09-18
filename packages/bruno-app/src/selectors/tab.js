import { createSelector } from '@reduxjs/toolkit';

// The full tab array. Use only when the component needs to render all tabs.
export const selectTabs = (state) => state.tabs.tabs;

export const selectActiveTabUid = (state) => state.tabs.activeTabUid;

export const selectTabByUid = (state, tabUid) =>
  tabUid ? state.tabs.tabs.find((t) => t.uid === tabUid) : undefined;

export const selectActiveTab = (state) =>
  selectTabByUid(state, state.tabs.activeTabUid);

/**
 * Creates a memoized selector for tabs belonging to a collection.
 *
 * The selector is created per component instance so each consumer maintains
 * its own cache. Create it with `useMemo` when used inside a component.
 */
export const makeSelectTabsForCollection = () =>
  createSelector(
    [selectTabs, (_state, collectionUid) => collectionUid],
    (tabs, collectionUid) => tabs.filter((t) => t.collectionUid === collectionUid)
  );

export const getTabUidForItem = ({ itemUid, itemPathname, collectionUid }) => createSelector([
  (state) => state.tabs.tabs
], (tabs) => {
  const tabByUid = tabs.find((tab) => tab.uid === itemUid && (!collectionUid || tab.collectionUid === collectionUid));
  if (tabByUid) {
    return tabByUid.uid;
  }

  if (!itemPathname) {
    return null;
  }

  const tabByPathname = tabs.find((tab) => (
    tab.type !== 'response-example'
    && tab.pathname === itemPathname
    && (!collectionUid || tab.collectionUid === collectionUid)
  ));
  return tabByPathname?.uid || null;
});

export const isTabForItemActive = ({ itemUid, itemPathname, collectionUid }) => createSelector([
  (state) => state.tabs?.activeTabUid,
  (state) => state.tabs.tabs
], (activeTabUid, tabs) => {
  if (!activeTabUid) {
    return false;
  }

  const activeTab = tabs.find((tab) => tab.uid === activeTabUid);
  if (!activeTab) {
    return false;
  }

  if (collectionUid && activeTab.collectionUid !== collectionUid) {
    return false;
  }

  if (activeTabUid === itemUid) {
    return true;
  }

  if (!itemPathname) {
    return false;
  }

  return activeTab.type !== 'response-example' && activeTab.pathname === itemPathname;
});

export const isTabForItemPresent = ({ itemUid, itemPathname, collectionUid }) => createSelector([
  (state) => state.tabs.tabs
], (tabs) => tabs.some((tab) => {
  if (collectionUid && tab.collectionUid !== collectionUid) {
    return false;
  }

  return tab.uid === itemUid || (itemPathname && tab.type !== 'response-example' && tab.pathname === itemPathname);
}));
