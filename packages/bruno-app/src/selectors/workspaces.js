import { createSelector } from '@reduxjs/toolkit';

const selectWorkspacesState = (state) => state.workspaces;

export const selectWorkspaces = createSelector([selectWorkspacesState], (workspacesState) => workspacesState?.workspaces || []);

export const selectActiveWorkspaceUid = createSelector(
  [selectWorkspacesState],
  (workspacesState) => workspacesState?.activeWorkspaceUid || null
);

export const selectActiveWorkspace = createSelector(
  [selectWorkspaces, selectActiveWorkspaceUid],
  (workspaces, activeWorkspaceUid) => workspaces.find((workspace) => workspace.uid === activeWorkspaceUid) || null
);

export const selectDefaultWorkspace = createSelector(
  [selectWorkspaces],
  (workspaces) => workspaces.find((workspace) => workspace.type === 'default') || null
);

export const selectActiveOrDefaultWorkspace = createSelector(
  [selectActiveWorkspace, selectDefaultWorkspace],
  (activeWorkspace, defaultWorkspace) => activeWorkspace || defaultWorkspace || null
);

export const makeSelectWorkspaceByUid = () =>
  createSelector([selectWorkspaces, (_, workspaceUid) => workspaceUid], (workspaces, workspaceUid) =>
    workspaces.find((workspace) => workspace.uid === workspaceUid) || null
  );
