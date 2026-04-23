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
  serializeActiveTab,
  getCollectionEnvironmentPath,
  hydrateSnapshotLookups
} from 'utils/snapshot';
import { normalizePath } from 'utils/common/path';

const { ipcRenderer } = window;

// Debounce timer reference
let saveTimer = null;
const DEBOUNCE_MS = 1000;

/**
 * Serialize the current app state into a snapshot format
 * Persists array-based schema and supports lookup hydration.
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

  const existingSnapshotLookups = hydrateSnapshotLookups(existingSnapshot || {});

  // Build a set of scratch collection UIDs to exclude
  const scratchCollectionUids = new Set(
    (workspaces.workspaces || [])
      .map((w) => w.scratchCollectionUid)
      .filter(Boolean)
  );

  const activeWorkspace = workspaces.workspaces.find(
    (w) => w.uid === workspaces.activeWorkspaceUid
  );

  const activeWorkspaceCollectionPaths = new Set(
    (activeWorkspace?.collections || [])
      .map((collection) => collection?.path)
      .filter(Boolean)
      .map((collectionPath) => normalizePath(collectionPath))
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
    workspaces: [],
    collections: []
  };

  // Track which collection pathnames we've serialized from Redux
  const serializedCollectionPaths = new Set();

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
      const existingWorkspace = existingSnapshotLookups.workspacesByPath[normalizePath(workspace.pathname)];
      lastActiveCollectionPathname = existingWorkspace?.lastActiveCollectionPathname || null;
    }

    snapshot.workspaces.push({
      pathname: workspace.pathname,
      environment: '',
      lastActiveCollectionPathname,
      sorting: 'az',
      collections: [...workspaceCollectionPaths],
      collectionPathnames: [...workspaceCollectionPaths]
    });
  });

  (collections.collections || []).forEach((collection) => {
    // Skip scratch collections and collections without pathname
    if (!collection.pathname || scratchCollectionUids.has(collection.uid)) {
      return;
    }

    const normalizedPath = normalizePath(collection.pathname);

    // Persist tab state only for the active workspace's collections.
    // For non-active workspaces, preserve the last persisted snapshot entries.
    if (activeWorkspace && !activeWorkspaceCollectionPaths.has(normalizedPath)) {
      return;
    }

    serializedCollectionPaths.add(normalizedPath);

    // Get transient directory for this collection to filter transient tabs
    const transientDirectory = collections.tempDirectories?.[collection.uid];

    // Filter and serialize tabs, excluding transient requests
    const collectionTabs = (tabs.tabs || [])
      .filter((t) => t.collectionUid === collection.uid && !shouldExcludeTab(t, transientDirectory))
      .map((t) => serializeTab(t, collection));

    const activeTabInCollection = (tabs.tabs || []).find(
      (t) => t.collectionUid === collection.uid && t.uid === tabs.activeTabUid && !shouldExcludeTab(t, transientDirectory)
    );

    // Find which workspace this collection belongs to
    const workspacePathname = snapshot.workspaces.find((workspaceSnapshot) => {
      return workspaceSnapshot.collectionPathnames.some((collectionPathname) => normalizePath(collectionPathname) === normalizedPath);
    })?.pathname || '';

    const selectedEnvironment = (collection.environments || []).find((env) => env.uid === collection.activeEnvironmentUid);
    const environmentPath = getCollectionEnvironmentPath(collection, selectedEnvironment, '');

    snapshot.collections.push({
      pathname: collection.pathname,
      workspacePathname,
      environment: {
        collection: environmentPath,
        global: globalEnvironments.activeGlobalEnvironmentUid || ''
      },
      environmentPath,
      selectedEnvironment: selectedEnvironment?.name || '',
      isOpen: !collection.collapsed,
      isMounted: collection.mountStatus === 'mounted',
      activeTab: serializeActiveTab(activeTabInCollection, collection),
      tabs: collectionTabs
    });
  });

  // Preserve collections from existing snapshot that aren't currently loaded in Redux
  Object.values(existingSnapshotLookups.collectionsByPath || {}).forEach((existingCollection) => {
    const normalizedPath = normalizePath(existingCollection.pathname || '');

    if (!normalizedPath || serializedCollectionPaths.has(normalizedPath)) {
      return;
    }

    const existingTabs = existingSnapshotLookups.tabsByCollectionPath?.[normalizedPath];

    snapshot.collections.push({
      pathname: existingCollection.pathname,
      workspacePathname: existingCollection.workspacePathname || '',
      environment: {
        collection: existingCollection.environment?.collection || existingCollection.environmentPath || '',
        global: existingCollection.environment?.global || ''
      },
      environmentPath: existingCollection.environment?.collection || existingCollection.environmentPath || '',
      selectedEnvironment: existingCollection.selectedEnvironment || '',
      isOpen: typeof existingCollection.isOpen === 'boolean' ? existingCollection.isOpen : false,
      isMounted: typeof existingCollection.isMounted === 'boolean' ? existingCollection.isMounted : false,
      activeTab: existingTabs?.activeTab || existingCollection.activeTab || null,
      tabs: Array.isArray(existingTabs?.tabs)
        ? existingTabs.tabs
        : (Array.isArray(existingCollection.tabs) ? existingCollection.tabs : [])
    });
  });

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

      if (!state.app?.snapshotReady) {
        saveTimer = null;
        return;
      }

      const snapshot = await serializeSnapshot(state);
      await ipcRenderer.invoke('renderer:snapshot:save', snapshot);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
    saveTimer = null;
  }, DEBOUNCE_MS);
};

const flushSnapshotNow = async (getState) => {
  try {
    const state = getState();
    const snapshot = await serializeSnapshot(state);
    await ipcRenderer.invoke('renderer:snapshot:save', snapshot);
  } catch (err) {
    console.error('Failed to flush snapshot:', err);
  }
};

/**
 * Snapshot middleware
 * Only saves after app signals it's ready (snapshotReady = true)
 */
export const snapshotMiddleware = ({ getState }) => (next) => (action) => {
  const wasSnapshotReady = getState().app.snapshotReady;
  const result = next(action);

  if (action.type === 'app/setSnapshotReady' && action.payload === false && wasSnapshotReady) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    void flushSnapshotNow(getState);
    return result;
  }

  // Only save if snapshot is ready (app has finished initial loading)
  const state = getState();
  if (state.app.snapshotReady && SAVE_TRIGGERS.has(action.type)) {
    scheduleSave(getState);
  }

  return result;
};

export default snapshotMiddleware;
