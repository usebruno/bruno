/**
 * Tracks which workspaces have been restored from snapshot in this session.
 */
const hydratedWorkspaces = new Set();

export const isWorkspaceHydrated = (workspaceUid) => hydratedWorkspaces.has(workspaceUid);

export const markWorkspaceHydrated = (workspaceUid) => hydratedWorkspaces.add(workspaceUid);
