import find from 'lodash/find';
import { normalizePath } from 'utils/common/path';

/**
 * Returns the set of collection UIDs that belong to the given workspace
 * (scratch collection + collections whose path is in workspace.collections).
 */
export function getWorkspaceCollectionUids(state, workspace) {
  if (!workspace) {
    return new Set();
  }
  const uids = new Set();
  if (workspace.scratchCollectionUid) {
    uids.add(workspace.scratchCollectionUid);
  }
  const workspacePaths = new Set(
    (workspace.collections || [])
      .filter((wc) => wc.path)
      .map((wc) => normalizePath(wc.path))
  );
  state.collections?.collections?.forEach((c) => {
    if (!c.pathname) return;
    if (workspacePaths.has(normalizePath(c.pathname))) {
      uids.add(c.uid);
    }
  });
  return uids;
}

/**
 * Returns the tab to focus so the active tab is in the current workspace, or null if no change needed.
 * Returns { uid } — the workspace overview's uid, or null when nothing should be focused (start page).
 */
export function getTabToFocusForCurrentWorkspace(state) {
  const activeTabUid = state.tabs?.activeTabUid;
  if (!activeTabUid || !state.tabs?.tabs?.length) {
    return null;
  }
  const activeTab = find(state.tabs.tabs, (t) => t.uid === activeTabUid);
  if (!activeTab) {
    return null;
  }
  const activeWorkspace = state.workspaces?.workspaces?.find(
    (w) => w.uid === state.workspaces?.activeWorkspaceUid
  );
  if (!activeWorkspace) {
    return null;
  }
  const workspaceCollectionUids = getWorkspaceCollectionUids(state, activeWorkspace);
  if (workspaceCollectionUids.has(activeTab.collectionUid)) {
    return null;
  }
  // Prefer this workspace's overview; otherwise fall through to "no tab" (start page) rather than
  // focusing another collection's tab that the tab bar isn't showing.
  const overviewTab = find(state.tabs.tabs, (t) => t.type === 'workspaceOverview' && workspaceCollectionUids.has(t.collectionUid));
  return { uid: overviewTab ? overviewTab.uid : null };
}
