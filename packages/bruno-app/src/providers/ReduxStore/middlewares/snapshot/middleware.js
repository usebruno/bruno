/**
 * Snapshot Middleware
 *
 * Automatically saves app state to disk when relevant state changes occur.
 * Uses debouncing to prevent excessive disk writes.
 */

import {
  SAVE_TRIGGERS,
  shouldExcludeTab,
  serializeTab,
  serializeActiveTab
} from 'utils/snapshot';
import { normalizePath } from 'utils/common/path';

const { ipcRenderer } = window;

// Debounce timer reference
let saveTimer = null;
const DEBOUNCE_MS = 1000;

/**
 * Serialize the current app state into a snapshot format
 * Produces map-based structure keyed by pathname for O(1) lookups
 */
const serializeSnapshot = async (state) => {
  const { workspaces, collections, tabs, logs, globalEnvironments } = state;

  // Get existing snapshot to preserve data for collections not currently loaded
  let existingSnapshot = null;
  try {
    existingSnapshot = await ipcRenderer.invoke('renderer:snapshot:get');
  } catch (err) {
    // Ignore - will create fresh snapshot
  }

  // Build a set of scratch collection UIDs to exclude
  const scratchCollectionUids = new Set(
    (workspaces.workspaces || [])
      .map((w) => w.scratchCollectionUid)
      .filter(Boolean)
  );

  const activeWorkspace = workspaces.workspaces.find(
    (w) => w.uid === workspaces.activeWorkspaceUid
  );

  const snapshot = {
    activeWorkspacePath: activeWorkspace?.pathname || null,
    extras: {
      devTools: {
        open: logs.isConsoleOpen,
        height: 300,
        tab: logs.activeTab,
        tabData: {}
      }
    },
    workspaces: {},
    collections: {},
    tabs: {}
  };

  // Track which collection pathnames we've serialized from Redux
  const serializedCollectionPaths = new Set();

  // Build a uid → pathname map for collections (used to resolve activeCollectionUid → pathname)
  const collectionUidToPathname = new Map();
  (collections.collections || []).forEach((c) => {
    if (c.uid && c.pathname) {
      collectionUidToPathname.set(c.uid, normalizePath(c.pathname));
    }
  });

  (workspaces.workspaces || []).forEach((workspace) => {
    if (!workspace.pathname) return;

    const workspaceCollectionPaths = (workspace.collections || []).map((c) => c.path).filter(Boolean);
    const normalizedWorkspacePaths = workspaceCollectionPaths.map((p) => normalizePath(p));
    const isActiveWorkspace = workspace.uid === workspaces.activeWorkspaceUid;

    // Resolve lastActiveCollectionPathname
    let lastActiveCollectionPathname = null;

    if (isActiveWorkspace) {
      const activeTab = tabs.tabs.find((t) => t.uid === tabs.activeTabUid);
      const activeCollection = activeTab
        ? (collections.collections || []).find((c) => c.uid === activeTab.collectionUid)
        : null;
      const normalizedPathname = activeCollection?.pathname ? normalizePath(activeCollection.pathname) : null;

      lastActiveCollectionPathname = normalizedPathname && normalizedWorkspacePaths.includes(normalizedPathname)
        ? normalizedPathname
        : null;
    } else {
      // For non-active workspaces, preserve from existing snapshot
      const existingWorkspace = existingSnapshot?.workspaces?.[workspace.pathname];
      lastActiveCollectionPathname = existingWorkspace?.lastActiveCollectionPathname || null;
    }

    snapshot.workspaces[workspace.pathname] = {
      lastActiveCollectionPathname,
      sorting: 'az',
      collectionPathnames: workspaceCollectionPaths
    };
  });

  (collections.collections || []).forEach((collection) => {
    // Skip scratch collections and collections without pathname
    if (!collection.pathname || scratchCollectionUids.has(collection.uid)) {
      return;
    }

    const normalizedPath = normalizePath(collection.pathname);
    serializedCollectionPaths.add(normalizedPath);

    // Find which workspace this collection belongs to
    const workspacePathname = Object.keys(snapshot.workspaces).find((wp) => {
      const ws = snapshot.workspaces[wp];
      return ws.collectionPathnames.some((cp) => normalizePath(cp) === normalizedPath);
    }) || '';

    snapshot.collections[collection.pathname] = {
      workspacePathname,
      environment: {
        collection: collection.activeEnvironmentUid || '',
        global: globalEnvironments.activeGlobalEnvironmentUid || ''
      },
      isOpen: !collection.collapsed,
      isMounted: collection.mountStatus === 'mounted'
    };

    // Get transient directory for this collection to filter transient tabs
    const transientDirectory = collections.tempDirectories?.[collection.uid];

    // Filter and serialize tabs, excluding transient requests
    const collectionTabs = (tabs.tabs || [])
      .filter((t) => t.collectionUid === collection.uid && !shouldExcludeTab(t, transientDirectory))
      .map((t) => serializeTab(t, collection));

    const activeTabInCollection = (tabs.tabs || []).find(
      (t) => t.collectionUid === collection.uid && t.uid === tabs.activeTabUid && !shouldExcludeTab(t, transientDirectory)
    );

    snapshot.tabs[collection.pathname] = {
      activeTab: serializeActiveTab(activeTabInCollection, collection),
      tabs: collectionTabs
    };
  });

  // Preserve collections and tabs from existing snapshot that aren't currently loaded in Redux
  if (existingSnapshot) {
    const existingCollections = existingSnapshot.collections || {};
    const existingTabs = existingSnapshot.tabs || {};

    Object.keys(existingCollections).forEach((pathname) => {
      if (!serializedCollectionPaths.has(normalizePath(pathname))) {
        snapshot.collections[pathname] = existingCollections[pathname];
      }
    });

    Object.keys(existingTabs).forEach((pathname) => {
      if (!serializedCollectionPaths.has(normalizePath(pathname))) {
        snapshot.tabs[pathname] = existingTabs[pathname];
      }
    });
  }

  return snapshot;
};

/**
 * Schedule a debounced save of the snapshot
 */
const scheduleSave = (getState) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    try {
      const state = getState();
      const snapshot = await serializeSnapshot(state);
      await ipcRenderer.invoke('renderer:snapshot:save', snapshot);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
    saveTimer = null;
  }, DEBOUNCE_MS);
};

/**
 * Snapshot middleware
 * Only saves after app signals it's ready (snapshotReady = true)
 */
export const snapshotMiddleware = ({ getState }) => (next) => (action) => {
  const result = next(action);

  // Only save if snapshot is ready (app has finished initial loading)
  const state = getState();
  if (state.app.snapshotReady && SAVE_TRIGGERS.has(action.type)) {
    scheduleSave(getState);
  }

  return result;
};

export default snapshotMiddleware;
