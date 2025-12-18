import { createSelector } from '@reduxjs/toolkit';
import { selectTabsForLocation, selectActiveTabIdForLocation } from 'providers/ReduxStore/slices/tabs';

const LOCATION = 'request-pane';

export const isTabForItemActive = ({ itemUid }) => createSelector([
  selectActiveTabIdForLocation(LOCATION)
], (activeTabUid) => activeTabUid === itemUid);

export const isTabForItemPresent = ({ itemUid }) => createSelector([
  selectTabsForLocation(LOCATION)
], (tabs) => tabs.some((tab) => tab.uid === itemUid));
