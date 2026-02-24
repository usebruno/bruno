import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';
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
    (workspace.collections || []).map((wc) => normalizePath(wc.path))
  );
  state.collections?.collections?.forEach((c) => {
    if (workspacePaths.has(normalizePath(c.pathname))) {
      uids.add(c.uid);
    }
  });
  return uids;
}

/**
 * Returns the tab to focus so the active tab is in the current workspace, or null if no change needed.
 * Returns { uid } or { uid, addOverviewFirst: true, scratchCollectionUid }.
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
  const inWorkspaceTabs = filter(state.tabs.tabs, (t) => workspaceCollectionUids.has(t.collectionUid));
  if (inWorkspaceTabs.length > 0) {
    return { uid: last(inWorkspaceTabs).uid };
  }
  const scratchCollectionUid = activeWorkspace.scratchCollectionUid;
  if (!scratchCollectionUid) {
    return null; // No tabs in current workspace and no scratch; cannot focus a valid tab.
  }
  const overviewTabUid = `${scratchCollectionUid}-overview`;
  const overviewTabExists = state.tabs.tabs.some((t) => t.uid === overviewTabUid);
  if (overviewTabExists) {
    return { uid: overviewTabUid };
  }
  return { uid: overviewTabUid, addOverviewFirst: true, scratchCollectionUid };
}
