import { createSelector } from '@reduxjs/toolkit';

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

  const tabByPathname = tabs.find((tab) => tab.pathname === itemPathname && (!collectionUid || tab.collectionUid === collectionUid));
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

  return activeTab.pathname === itemPathname;
});

export const isTabForItemPresent = ({ itemUid, itemPathname, collectionUid }) => createSelector([
  (state) => state.tabs.tabs
], (tabs) => tabs.some((tab) => {
  if (collectionUid && tab.collectionUid !== collectionUid) {
    return false;
  }

  return tab.uid === itemUid || (itemPathname && tab.pathname === itemPathname);
}));
