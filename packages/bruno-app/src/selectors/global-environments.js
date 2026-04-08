import { createSelector } from '@reduxjs/toolkit';

const selectGlobalEnvironmentsState = (state) => state.globalEnvironments;

export const selectGlobalEnvironments = createSelector(
  [selectGlobalEnvironmentsState],
  (globalEnvironmentsState) => globalEnvironmentsState?.globalEnvironments || []
);

export const selectActiveGlobalEnvironmentUid = createSelector(
  [selectGlobalEnvironmentsState],
  (globalEnvironmentsState) => globalEnvironmentsState?.activeGlobalEnvironmentUid || null
);

export const selectGlobalEnvironmentDraft = createSelector(
  [selectGlobalEnvironmentsState],
  (globalEnvironmentsState) => globalEnvironmentsState?.globalEnvironmentDraft || null
);
