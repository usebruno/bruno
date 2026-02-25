import path from 'utils/common/path';
import { findItemInCollection } from 'utils/collections';

/**
 * Tab type mapping from Redux to schema format
 */
const TAB_TYPE_TO_SCHEMA = {
  'preferences': 'preferences',
  'collection-runner': 'runner',
  'variables': 'variables',
  'collection-settings': 'collection',
  'environment-settings': 'environment',
  'global-environment-settings': 'global-environment',
  'request': 'item',
  'http-request': 'item',
  'graphql-request': 'item',
  'grpc-request': 'item',
  'ws-request': 'item'
};

/**
 * Get the relative item path from collection root
 * e.g., /Users/me/api-collection/requests/users/get.bru -> requests/users/get.bru
 */
export const getRelativeItemPath = (itemPathname, collectionPathname) => {
  if (!itemPathname || !collectionPathname) {
    return null;
  }

  // Normalize paths and get relative path
  const normalizedItem = path.normalize(itemPathname);
  const normalizedCollection = path.normalize(collectionPathname);

  if (normalizedItem.startsWith(normalizedCollection)) {
    let relativePath = normalizedItem.slice(normalizedCollection.length);
    // Remove leading separator
    if (relativePath.startsWith(path.sep) || relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }
    return relativePath;
  }

  return null;
};

/**
 * Serialize a single tab to schema format
 */
export const serializeTab = (tab, collection, preferences) => {
  const schemaType = TAB_TYPE_TO_SCHEMA[tab.type] || 'item';

  const serialized = {
    type: schemaType,
    permanent: !tab.preview
  };

  // For item tabs, include the relative item path and pane states
  if (schemaType === 'item') {
    const item = findItemInCollection(collection, tab.uid);
    if (item) {
      serialized.itemPath = getRelativeItemPath(item.pathname, collection.pathname);

      // Store layout orientation (from global preferences)
      const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
      serialized.layout = isVerticalLayout ? 'vertical' : 'horizontal';

      // Store request pane state
      serialized.request = {
        tab: tab.requestPaneTab || null,
        width: tab.requestPaneWidth || 0,
        height: tab.requestPaneHeight || 0
      };

      // Store response pane state
      serialized.response = {
        tab: tab.responsePaneTab || 'response',
        format: tab.responseFormat || null,
        preview: tab.responseViewTab === 'preview'
      };
    } else {
      return null;
    }
  }

  return serialized;
};

/**
 * Serialize DevTools state
 */
export const serializeDevTools = (logsState, devtoolsHeight) => {
  return {
    open: logsState.isConsoleOpen || false,
    tab: logsState.activeTab || 'console',
    height: devtoolsHeight || 300
  };
};

/**
 * Check if a collection is a scratch/transient collection that should not be persisted
 */
const isScratchCollection = (collection, workspaces) => {
  // Check if this collection is a scratch collection for any workspace
  for (const workspace of workspaces) {
    if (workspace.scratchCollectionUid === collection.uid) {
      return true;
    }
  }

  // Also check if pathname contains transient/scratch paths
  const pathname = collection.pathname || '';
  if (pathname.includes('/tmp/transient/') || pathname.includes('bruno-scratch')) {
    return true;
  }

  return false;
};

/**
 * Serialize the entire app snapshot from Redux state
 * Preserves pending workspace restores for workspaces that haven't been visited yet
 */
export const serializeAppSnapshot = (state) => {
  const { collections: collectionsState, tabs: tabsState, workspaces: workspacesState, logs: logsState, app: appState, preferences } = state;
  const collections = collectionsState.collections || [];
  const tabs = tabsState.tabs || [];
  const activeTabUid = tabsState.activeTabUid;
  const workspaces = workspacesState.workspaces || [];
  const activeWorkspaceUid = workspacesState.activeWorkspaceUid;
  const pendingWorkspaceRestores = appState.pendingWorkspaceRestores || {};

  // Filter out scratch/transient collections
  const persistableCollections = collections.filter(
    (collection) => !isScratchCollection(collection, workspaces)
  );

  // Build a map of collectionUid -> tabs (excluding scratch collection tabs)
  const scratchCollectionUids = new Set(
    collections
      .filter((c) => isScratchCollection(c, workspaces))
      .map((c) => c.uid)
  );

  const tabsByCollection = {};
  tabs.forEach((tab) => {
    // Skip tabs for scratch collections
    if (scratchCollectionUids.has(tab.collectionUid)) {
      return;
    }
    if (!tabsByCollection[tab.collectionUid]) {
      tabsByCollection[tab.collectionUid] = [];
    }
    tabsByCollection[tab.collectionUid].push(tab);
  });

  // Serialize collections from current state (only persistable ones)
  const serializedCollections = persistableCollections.map((collection) => {
    const collectionTabs = tabsByCollection[collection.uid] || [];

    // Serialize tabs for this collection
    const serializedTabs = collectionTabs
      .map((tab) => serializeTab(tab, collection, preferences))
      .filter(Boolean); // Remove nulls (tabs that couldn't be serialized)

    // Find active tab index for this collection
    let activeTabIndex = 0;
    if (activeTabUid) {
      const activeTabIdx = collectionTabs.findIndex((t) => t.uid === activeTabUid);
      if (activeTabIdx !== -1) {
        activeTabIndex = activeTabIdx;
      }
    }

    return {
      pathname: collection.pathname,
      isMounted: collection.mountStatus === 'mounted',
      isOpen: !collection.collapsed,
      environment: collection.activeEnvironmentUid
        ? collection.environments?.find((e) => e.uid === collection.activeEnvironmentUid)?.name || null
        : null,
      tabs: serializedTabs,
      activeTabIndex: serializedTabs.length > 0 ? activeTabIndex : 0
    };
  });

  // Collect all serialized collection pathnames for deduplication
  const serializedCollectionPaths = new Set(serializedCollections.map((c) => c.pathname));

  // Add collections from pending workspace restores (for workspaces not yet visited)
  const pendingCollections = [];
  Object.values(pendingWorkspaceRestores).forEach((restoreData) => {
    if (restoreData.collections) {
      restoreData.collections.forEach((col) => {
        // Only add if not already in serialized collections
        if (!serializedCollectionPaths.has(col.pathname)) {
          pendingCollections.push(col);
          serializedCollectionPaths.add(col.pathname);
        }
      });
    }
  });

  // Combine current state collections with pending restore collections
  const allSerializedCollections = [...serializedCollections, ...pendingCollections];

  // Serialize workspaces
  const serializedWorkspaces = workspaces.map((workspace) => {
    // Check if this workspace has pending restore data
    const pendingRestore = pendingWorkspaceRestores[workspace.pathname];

    if (pendingRestore && pendingRestore.collections) {
      // Use the pending restore data for this workspace
      return {
        pathname: workspace.pathname,
        collections: pendingRestore.collections.map((c) => ({
          ...c,
          isMounted: false // Mark as not mounted since it's pending
        }))
      };
    }

    // Get collection pathnames that belong to this workspace
    const workspaceCollectionPaths = (workspace.collections || []).map((c) => c.path);

    // Find which collections are open in this workspace (exist in Redux state)
    // The isMounted flag is already set correctly based on mountStatus
    const workspaceCollections = serializedCollections.filter((sc) =>
      workspaceCollectionPaths.includes(sc.pathname)
    );

    return {
      pathname: workspace.pathname,
      collections: workspaceCollections
    };
  });

  // Get devtools height from logs state
  const devtoolsHeight = logsState.devtoolsHeight || 300;

  return {
    version: 1,
    activeWorkspacePathname: workspaces.find((w) => w.uid === activeWorkspaceUid)?.pathname || null,
    workspaces: serializedWorkspaces,
    collections: allSerializedCollections,
    extras: {
      devTools: serializeDevTools(logsState, devtoolsHeight)
    }
  };
};
