import { createSelector } from '@reduxjs/toolkit';

export const isTabForItemActive = ({ itemUid }) => createSelector([
    (state) => state.tabs?.activeTabUid
], (activeTabUid) => activeTabUid === itemUid);

export const isTabForItemPresent = ({ itemUid }) => createSelector([
    (state) => state.tabs.tabs,
], (tabs) => tabs.some((tab) => tab.uid === itemUid));