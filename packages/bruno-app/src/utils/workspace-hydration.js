/**
 * In-memory tracker for workspace hydration state.
 * Tracks which workspaces have been restored from snapshot in this session.
 * Resets on app restart (which is fine - we restore from snapshot anyway).
 */

const hydratedWorkspaces = new Set();

export const isWorkspaceHydrated = (workspaceUid) => {
  return hydratedWorkspaces.has(workspaceUid);
};

export const markWorkspaceHydrated = (workspaceUid) => {
  hydratedWorkspaces.add(workspaceUid);
};
