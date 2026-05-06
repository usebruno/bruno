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
import { TAB_IDENFIERS as DEVTOOL_TABS } from 'providers/ReduxStore/slices/logs';

const { ipcRenderer } = window;

// Debounce timer reference
let saveTimer = null;
const DEBOUNCE_MS = 1000;

const COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING = {
  default: 'default',
  alphabetical: 'alphabetical',
  reverseAlphabetical: 'reverseAlphabetical'
};

const normalizeCollectionSortOrder = (sortOrder) => {
  return COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING[sortOrder] || 'default';
};

const normalizeWorkspaceSorting = (sorting) => {
  return COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING[sorting] || 'default';
};

const getWorkspaceCollectionSnapshotKey = (workspacePathname, collectionPathname) => {
  const normalizedCollectionPathname = normalizePath(collectionPathname);
  if (!normalizedCollectionPathname) {
    return '';
  }

  return `${normalizePath(workspacePathname || '')}::${normalizedCollectionPathname}`;
};

/**
 * Serialize the current app state into a snapshot format
 * Persists array-based schema and supports lookup hydration.
 */
const serializeSnapshot = async (state) => {
  const { workspaces, collections, tabs, logs, globalEnvironments } = state;
  const snapshotHydration = state.app?.snapshotHydration;
  const activeWorkspaceCollectionSortOrder = normalizeCollectionSortOrder(collections.collectionSortOrder);

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

  const existingDevTools = existingSnapshot?.extras?.devTools ?? {};

  const snapshot = {
    activeWorkspacePath: activeWorkspace?.pathname || null,
    extras: {
      devTools: {
        open: logs.isConsoleOpen,
        activeTab: logs.activeTab ?? existingDevTools.activeTab ?? 'terminal',
        tabs: Object.assign(existingDevTools.tabs, {
          [logs.activeTab]: {}
        })
      }
    },
    workspaces: [],
    collections: []
  };

  // Track which workspace+collection entries we've serialized from Redux
  const serializedCollectionKeys = new Set();

  (workspaces.workspaces || []).forEach((workspace) => {
    if (!workspace.pathname) return;

    const workspaceCollectionPaths = (workspace.collections || []).map((c) => c.path).filter(Boolean);
    const normalizedWorkspacePaths = workspaceCollectionPaths.map((p) => normalizePath(p));
    const isActiveWorkspace = workspace.uid === workspaces.activeWorkspaceUid;
    const existingWorkspace = existingSnapshotLookups.workspacesByPath[normalizePath(workspace.pathname)];

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
      lastActiveCollectionPathname = existingWorkspace?.lastActiveCollectionPathname || null;
    }

    const workspaceSorting = isActiveWorkspace
      ? activeWorkspaceCollectionSortOrder
      : normalizeWorkspaceSorting(existingWorkspace?.sorting);

    snapshot.workspaces.push({
      pathname: workspace.pathname,
      environment: '',
      lastActiveCollectionPathname,
      sorting: workspaceSorting,
      collections: [...workspaceCollectionPaths]
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

    const workspacePathname = activeWorkspace?.pathname || '';
    const collectionSnapshotKey = getWorkspaceCollectionSnapshotKey(workspacePathname, collection.pathname);
    if (collectionSnapshotKey) {
      serializedCollectionKeys.add(collectionSnapshotKey);
    }

    // Get transient directory for this collection to filter transient tabs
    const transientDirectory = collections.tempDirectories?.[collection.uid];

    // Filter and serialize tabs, excluding transient requests
    const collectionTabs = (tabs.tabs || [])
      .filter((t) => t.collectionUid === collection.uid && !shouldExcludeTab(t, transientDirectory))
      .map((t) => serializeTab(t, collection));

    const activeTabInCollection = (tabs.tabs || []).find(
      (t) => t.collectionUid === collection.uid && t.uid === tabs.activeTabUid && !shouldExcludeTab(t, transientDirectory)
    );

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

  const pendingHydrationPaths = new Set(
    (snapshotHydration?.pendingCollectionPathnames || []).map((pathname) => normalizePath(pathname))
  );

  // Preserve collections from existing snapshot that aren't currently loaded in Redux
  // and collections that are still pending hydration during workspace switch.
  const existingCollections = Object.values(existingSnapshotLookups.collectionsByWorkspaceAndPath || {});
  const fallbackCollections = Object.values(existingSnapshotLookups.collectionsByPath || {});

  (existingCollections.length > 0 ? existingCollections : fallbackCollections).forEach((existingCollection) => {
    const normalizedPath = normalizePath(existingCollection.pathname || '');
    const workspacePathname = existingCollection.workspacePathname || '';
    const collectionSnapshotKey = getWorkspaceCollectionSnapshotKey(workspacePathname, existingCollection.pathname);
    const isSerializedCollection = collectionSnapshotKey && serializedCollectionKeys.has(collectionSnapshotKey);
    const shouldPreservePendingHydration = pendingHydrationPaths.has(normalizedPath)
      && activeWorkspace?.pathname
      && normalizePath(workspacePathname) === normalizePath(activeWorkspace.pathname);

    if (!normalizedPath || (isSerializedCollection && !shouldPreservePendingHydration)) {
      return;
    }

    const existingTabs = (collectionSnapshotKey && existingSnapshotLookups.tabsByWorkspaceAndCollectionPath?.[collectionSnapshotKey])
      || existingSnapshotLookups.tabsByCollectionPath?.[normalizedPath];

    snapshot.collections.push({
      pathname: existingCollection.pathname,
      workspacePathname,
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
