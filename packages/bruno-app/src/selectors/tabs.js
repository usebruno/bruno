import { createSelector } from '@reduxjs/toolkit';

const selectTabsState = (state) => state.tabs;

export const selectTabs = createSelector([selectTabsState], (tabsState) => tabsState?.tabs || []);

export const selectActiveTabUid = createSelector([selectTabsState], (tabsState) => tabsState?.activeTabUid || null);

export const selectActiveTab = createSelector([selectTabs, selectActiveTabUid], (tabs, activeTabUid) =>
  tabs.find((tab) => tab.uid === activeTabUid) || null
);

export const selectActiveTabTableColumnWidths = createSelector(
  [selectActiveTab],
  (activeTab) => activeTab?.tableColumnWidths || {}
);

export const makeSelectTabByUid = () =>
  createSelector([selectTabs, (_, tabUid) => tabUid], (tabs, tabUid) => tabs.find((tab) => tab.uid === tabUid) || null);

export const makeSelectTabsByCollectionUid = () =>
  createSelector([selectTabs, (_, collectionUid) => collectionUid], (tabs, collectionUid) =>
    tabs.filter((tab) => tab.collectionUid === collectionUid)
  );
