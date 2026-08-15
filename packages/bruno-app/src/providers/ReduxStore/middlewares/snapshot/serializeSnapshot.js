import {
  shouldExcludeTab,
  serializeTab,
  serializeActiveTab,
  getCollectionEnvironmentPath,
  hydrateSnapshotLookups,
  WORKSPACE_TAB_TYPES
} from 'utils/snapshot';
import { normalizePath } from 'utils/common/path';

const { ipcRenderer } = window;

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

const shouldPreserveCollectionEnvironmentInSnapshot = ({
  collection,
  environmentPathFromRedux,
  selectedEnvironmentFromRedux,
  existingEnvironmentPath,
  existingSelectedEnvironment
}) => {
  const hasAuthoritativeReduxEnvironment = Boolean(
    selectedEnvironmentFromRedux || environmentPathFromRedux
  );

  if (hasAuthoritativeReduxEnvironment) {
    return false;
  }

  const hasExistingSnapshotEnvironment = Boolean(
    existingEnvironmentPath || existingSelectedEnvironment
  );

  if (!hasExistingSnapshotEnvironment) {
    return false;
  }

  const isCollectionEnvironmentHydrated = collection.mountStatus === 'mounted'
    && Array.isArray(collection.environments)
    && collection.environments.length > 0;

  return collection.mountStatus !== 'mounted' || !isCollectionEnvironmentHydrated;
};

/**
 * Serialize the current app state into a snapshot format.
 * Persists array-based schema and supports lookup hydration.
 */
export const serializeSnapshot = async (state, options = {}) => {
  const { getExistingSnapshot } = options;
  const { workspaces, collections, tabs, logs, globalEnvironments } = state;
  const snapshotHydration = state.app?.snapshotHydration;
  const activeWorkspaceCollectionSortOrder = normalizeCollectionSortOrder(collections.collectionSortOrder);

  let existingSnapshot = null;
  try {
    if (typeof getExistingSnapshot === 'function') {
      existingSnapshot = await getExistingSnapshot();
    } else {
      existingSnapshot = await ipcRenderer.invoke('renderer:snapshot:get');
    }
  } catch (err) {
    // Ignore - will create fresh snapshot
  }

  const existingSnapshotLookups = hydrateSnapshotLookups(existingSnapshot || {});

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
  const resolvedDevToolsActiveTab = logs.activeTab ?? existingDevTools.activeTab ?? 'terminal';
  const existingDevToolsTabs = existingDevTools.tabs || {};

  const snapshot = {
    activeWorkspacePath: activeWorkspace?.pathname || null,
    extras: {
      devTools: {
        open: logs.isConsoleOpen,
        activeTab: resolvedDevToolsActiveTab,
        tabs: {
          ...existingDevToolsTabs,
          [resolvedDevToolsActiveTab]: existingDevToolsTabs[resolvedDevToolsActiveTab] ?? {}
        }
      },
      sidebar: {
        width: state.app.leftSidebarWidth,
        collapsed: state.app.sidebarCollapsed
      }
    },
    workspaces: [],
    collections: []
  };

  const serializedCollectionKeys = new Set();

  (workspaces.workspaces || []).forEach((workspace) => {
    if (!workspace.pathname) return;

    const workspaceCollectionPaths = (workspace.collections || []).map((c) => c.path).filter(Boolean);
    const normalizedWorkspacePaths = workspaceCollectionPaths.map((p) => normalizePath(p));
    const isActiveWorkspace = workspace.uid === workspaces.activeWorkspaceUid;
    const existingWorkspace = existingSnapshotLookups.workspacesByPath[normalizePath(workspace.pathname)];

    let lastActiveCollectionPathname = null;
    let activeWorkspaceTabType = null;

    if (isActiveWorkspace) {
      const activeTab = tabs.tabs.find((t) => t.uid === tabs.activeTabUid);
      const activeCollection = activeTab
        ? (collections.collections || []).find((c) => c.uid === activeTab.collectionUid)
        : null;
      const normalizedPathname = activeCollection?.pathname ? normalizePath(activeCollection.pathname) : null;

      lastActiveCollectionPathname = normalizedPathname && normalizedWorkspacePaths.includes(normalizedPathname)
        ? normalizedPathname
        : null;

      if (
        activeTab
        && workspace.scratchCollectionUid
        && activeTab.collectionUid === workspace.scratchCollectionUid
        && WORKSPACE_TAB_TYPES.has(activeTab.type)
      ) {
        activeWorkspaceTabType = activeTab.type;
      }
    } else {
      lastActiveCollectionPathname = existingWorkspace?.lastActiveCollectionPathname || null;
      activeWorkspaceTabType = existingWorkspace?.activeWorkspaceTabType || null;
    }

    const workspaceSorting = isActiveWorkspace
      ? activeWorkspaceCollectionSortOrder
      : normalizeWorkspaceSorting(existingWorkspace?.sorting);

    snapshot.workspaces.push({
      pathname: workspace.pathname,
      environment: '',
      lastActiveCollectionPathname,
      sorting: workspaceSorting,
      activeWorkspaceTabType,
      collections: [...workspaceCollectionPaths]
    });
  });

  (collections.collections || []).forEach((collection) => {
    if (!collection.pathname || scratchCollectionUids.has(collection.uid)) {
      return;
    }

    const normalizedPath = normalizePath(collection.pathname);

    if (activeWorkspace && !activeWorkspaceCollectionPaths.has(normalizedPath)) {
      return;
    }

    const workspacePathname = activeWorkspace?.pathname || '';
    const collectionSnapshotKey = getWorkspaceCollectionSnapshotKey(workspacePathname, collection.pathname);
    const existingCollection = (collectionSnapshotKey && existingSnapshotLookups.collectionsByWorkspaceAndPath?.[collectionSnapshotKey])
      || existingSnapshotLookups.collectionsByPath?.[normalizedPath]
      || null;
    if (collectionSnapshotKey) {
      serializedCollectionKeys.add(collectionSnapshotKey);
    }

    const transientDirectory = collections.tempDirectories?.[collection.uid];

    const collectionTabs = (tabs.tabs || [])
      .filter((t) => t.collectionUid === collection.uid && !shouldExcludeTab(t, transientDirectory))
      .map((t) => serializeTab(t, collection));

    const activeTabInCollection = (tabs.tabs || []).find(
      (t) => t.collectionUid === collection.uid && t.uid === tabs.activeTabUid && !shouldExcludeTab(t, transientDirectory)
    );

    const selectedEnvironment = (collection.environments || []).find((env) => env.uid === collection.activeEnvironmentUid);
    const environmentPathFromRedux = getCollectionEnvironmentPath(collection, selectedEnvironment, '');
    const selectedEnvironmentFromRedux = selectedEnvironment?.name || '';
    const existingEnvironmentPath = existingCollection?.environment?.collection || existingCollection?.environmentPath || '';
    const existingSelectedEnvironment = existingCollection?.selectedEnvironment || '';
    const shouldPreserveExistingEnvironment = shouldPreserveCollectionEnvironmentInSnapshot({
      collection,
      environmentPathFromRedux,
      selectedEnvironmentFromRedux,
      existingEnvironmentPath,
      existingSelectedEnvironment
    });
    const environmentPath = shouldPreserveExistingEnvironment ? existingEnvironmentPath : environmentPathFromRedux;
    const selectedEnvironmentName = shouldPreserveExistingEnvironment
      ? existingSelectedEnvironment
      : selectedEnvironmentFromRedux;

    snapshot.collections.push({
      pathname: collection.pathname,
      workspacePathname,
      environment: {
        collection: environmentPath,
        global: globalEnvironments.activeGlobalEnvironmentUid || ''
      },
      environmentPath,
      selectedEnvironment: selectedEnvironmentName,
      isOpen: !collection.collapsed,
      isMounted: collection.mountStatus === 'mounted',
      activeTab: serializeActiveTab(activeTabInCollection, collection),
      tabs: collectionTabs
    });
  });

  const pendingHydrationPaths = new Set(
    (snapshotHydration?.pendingCollectionPathnames || []).map((pathname) => normalizePath(pathname))
  );

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

export { shouldPreserveCollectionEnvironmentInSnapshot };
