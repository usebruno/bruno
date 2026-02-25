import path from 'utils/common/path';
import { flattenItems, findCollectionByPathname } from 'utils/collections';

/**
 * Tab type mapping from schema to Redux format
 */
const SCHEMA_TYPE_TO_TAB = {
  'preferences': 'preferences',
  'runner': 'collection-runner',
  'variables': 'variables',
  'collection': 'collection-settings',
  'environment': 'environment-settings',
  'global-environment': 'global-environment-settings',
  'item': 'request'
};

/**
 * Find an item in a collection by its relative path
 * e.g., "requests/users/get.bru" -> item object
 */
export const findItemByRelativePath = (collection, relativePath) => {
  if (!collection || !relativePath) {
    return null;
  }

  // Build the full pathname
  const fullPathname = path.join(collection.pathname, relativePath);

  // Flatten items and search
  const flatItems = flattenItems(collection.items || []);
  return flatItems.find((item) => {
    const normalizedItemPath = path.normalize(item.pathname);
    const normalizedFullPath = path.normalize(fullPathname);
    return normalizedItemPath === normalizedFullPath;
  });
};

/**
 * Deserialize a tab from schema format to Redux format
 */
export const deserializeTab = (tabSchema, collection) => {
  const { type, itemPath, permanent, request, response } = tabSchema;

  // For non-item tabs, return the basic structure
  if (type !== 'item') {
    const tabType = SCHEMA_TYPE_TO_TAB[type] || type;

    // Generate the correct UID based on tab type (must match how tabs are created)
    let uid;
    switch (tabType) {
      case 'environment-settings':
        uid = `${collection.uid}-environment-settings`;
        break;
      case 'global-environment-settings':
        uid = `${collection.uid}-global-environment-settings`;
        break;
      case 'preferences':
        uid = `${collection.uid}-preferences`;
        break;
      case 'variables':
        uid = `${collection.uid}-variables`;
        break;
      case 'collection-runner':
        uid = `${collection.uid}-runner`;
        break;
      case 'collection-settings':
      default:
        uid = collection.uid;
        break;
    }

    return {
      type: tabType,
      collectionUid: collection.uid,
      uid,
      preview: !permanent
    };
  }

  // For item tabs, find the item by relative path
  if (!itemPath) {
    console.warn('[app-snapshot] Item tab missing itemPath, skipping');
    return null;
  }

  const item = findItemByRelativePath(collection, itemPath);
  if (!item) {
    console.warn(`[app-snapshot] Item not found at path: ${itemPath}, skipping tab`);
    return null;
  }

  // Determine the tab type based on the item type
  let tabType = 'request';
  if (item.type === 'http-request') tabType = 'http-request';
  else if (item.type === 'graphql-request') tabType = 'graphql-request';
  else if (item.type === 'grpc-request') tabType = 'grpc-request';
  else if (item.type === 'ws-request') tabType = 'ws-request';

  const tab = {
    type: tabType,
    collectionUid: collection.uid,
    uid: item.uid,
    preview: !permanent
  };

  // Restore request pane state
  if (request) {
    if (request.tab !== undefined) tab.requestPaneTab = request.tab;
    if (request.width !== undefined) tab.requestPaneWidth = request.width;
    if (request.height !== undefined) tab.requestPaneHeight = request.height;
  }

  // Restore response pane state
  if (response) {
    if (response.tab !== undefined) tab.responsePaneTab = response.tab;
    if (response.format !== undefined) tab.responseFormat = response.format;
    if (response.preview !== undefined) {
      tab.responseViewTab = response.preview ? 'preview' : 'editor';
    }
  }

  return tab;
};

/**
 * Deserialize DevTools state
 */
export const deserializeDevTools = (devToolsSchema) => {
  if (!devToolsSchema) {
    return {
      isConsoleOpen: false,
      activeTab: 'console',
      devtoolsHeight: 300
    };
  }

  return {
    isConsoleOpen: devToolsSchema.open || false,
    activeTab: devToolsSchema.tab || 'console',
    devtoolsHeight: devToolsSchema.height || 300
  };
};

/**
 * Build a restore sequence from a snapshot
 * Returns an object with actions to be dispatched
 */
export const buildRestoreSequence = (snapshot, currentState) => {
  if (!snapshot || snapshot.version !== 1) {
    console.warn('[app-snapshot] Invalid or missing snapshot');
    return null;
  }

  const { collections: currentCollections } = currentState.collections;

  const restoreActions = {
    collectionsToMount: [],
    tabsToRestore: {},
    activeTabIndices: {},
    environmentsToSelect: {},
    devTools: deserializeDevTools(snapshot.extras?.devTools),
    activeWorkspacePathname: snapshot.activeWorkspacePathname
  };

  // Process collections from snapshot
  const snapshotCollections = snapshot.collections || [];

  snapshotCollections.forEach((collectionSchema) => {
    const { pathname, environment, tabs, activeTabIndex } = collectionSchema;

    // Check if collection is already mounted
    const existingCollection = findCollectionByPathname(currentCollections, pathname);

    if (!existingCollection) {
      // Collection needs to be mounted
      restoreActions.collectionsToMount.push(pathname);
    }

    // Store tabs to restore (will be processed after collections are mounted)
    if (tabs && tabs.length > 0) {
      restoreActions.tabsToRestore[pathname] = tabs;
      restoreActions.activeTabIndices[pathname] = activeTabIndex || 0;
    }

    // Store environment to select
    if (environment) {
      restoreActions.environmentsToSelect[pathname] = environment;
    }
  });

  return restoreActions;
};

/**
 * Restore tabs for a single collection
 * Call this after the collection has been mounted
 */
export const restoreTabsForCollection = (collection, tabSchemas) => {
  if (!collection || !tabSchemas || !tabSchemas.length) {
    return [];
  }

  return tabSchemas
    .map((tabSchema) => deserializeTab(tabSchema, collection))
    .filter(Boolean);
};
