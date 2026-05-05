import { findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';
import path, { normalizePath } from 'utils/common/path';
import { uuid } from 'utils/common';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const REQUEST_TAB_TYPES = new Set(['http-request', 'graphql-request', 'grpc-request', 'ws-request']);
const SINGLETON_TAB_TYPES = new Set([
  'variables',
  'collection-runner',
  'collection-settings',
  'collection-overview',
  'environment-settings',
  'openapi-sync',
  'openapi-spec'
]);

const NON_REPLACEABLE_SINGLETON_TAB_TYPES = new Set([
  'collection-runner',
  'variables',
  'openapi-sync',
  'openapi-spec'
]);

export const SAVE_TRIGGERS = new Map([
  ['app/setSnapshotReady', null],
  ['tabs/addTab', null],
  ['tabs/closeTabs', null],
  ['tabs/focusTab', null],
  ['tabs/closeAllCollectionTabs', null],
  ['tabs/reorderTabs', null],
  ['tabs/makeTabPermanent', null],
  ['tabs/updateRequestPaneTab', null],
  ['tabs/updateRequestPaneTabWidth', null],
  ['tabs/updateRequestPaneTabHeight', null],
  ['tabs/updateResponsePaneTab', null],
  ['tabs/updateResponsePaneScrollPosition', null],
  ['tabs/updateResponseFormat', null],
  ['tabs/updateResponseViewTab', null],
  ['tabs/updateScriptPaneTab', null],
  ['tabs/updateRequestBodyScrollPosition', null],
  ['workspaces/setActiveWorkspace', null],
  ['collections/selectEnvironment', null],
  ['collections/sortCollections', null],
  ['collections/updateCollectionMountStatus', null],
  ['collections/toggleCollection', null],
  ['collections/expandCollection', null],
  ['logs/openConsole', null],
  ['logs/closeConsole', null],
  ['logs/setActiveTab', null]
]);

export const isRequestTab = (type) => REQUEST_TAB_TYPES.has(type);

export const shouldExcludeTab = (tab, transientDirectory) => {
  return transientDirectory && tab.pathname?.startsWith(transientDirectory);
};

const normalizeSnapshotPathRef = (value) => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  return value.replace(/\\/g, '/').replace(/\/+$/, '');
};

const getWorkspaceCollectionSnapshotKey = (workspacePathname, collectionPathname) => {
  const normalizedCollectionPathname = normalizePath(collectionPathname);
  if (!normalizedCollectionPathname) {
    return '';
  }

  return `${normalizePath(workspacePathname || '')}::${normalizedCollectionPathname}`;
};

const isCollectionSharedAcrossWorkspaces = (snapshotLookups = {}, collectionPathname) => {
  const normalizedCollectionPathname = normalizePath(collectionPathname);
  if (!normalizedCollectionPathname) {
    return false;
  }

  let workspaceCount = 0;
  Object.values(snapshotLookups.workspacesByPath || {}).forEach((workspace) => {
    const hasCollection = (workspace?.collections || []).some(
      (workspaceCollectionPathname) => normalizePath(workspaceCollectionPathname) === normalizedCollectionPathname
    );

    if (hasCollection) {
      workspaceCount += 1;
    }
  });

  return workspaceCount > 1;
};

const normalizeCollectionSnapshotEntry = (pathname, entry = {}, tabsEntry = {}) => {
  const environment = isObject(entry.environment) ? entry.environment : {};
  const fallbackEnvironmentPath = entry.environmentPath ?? entry.selectedEnvironment;

  const collectionEnvironmentPath = typeof environment.collection === 'string'
    ? environment.collection
    : (typeof fallbackEnvironmentPath === 'string' ? fallbackEnvironmentPath : '');

  return {
    pathname,
    workspacePathname: typeof entry.workspacePathname === 'string' ? entry.workspacePathname : '',
    environment: {
      collection: collectionEnvironmentPath,
      global: typeof environment.global === 'string' ? environment.global : ''
    },
    environmentPath: typeof entry.environmentPath === 'string' ? entry.environmentPath : collectionEnvironmentPath,
    selectedEnvironment: typeof entry.selectedEnvironment === 'string' ? entry.selectedEnvironment : '',
    isOpen: typeof entry.isOpen === 'boolean' ? entry.isOpen : false,
    isMounted: typeof entry.isMounted === 'boolean' ? entry.isMounted : false,
    activeTab: tabsEntry.activeTab ?? entry.activeTab ?? null,
    tabs: Array.isArray(tabsEntry.tabs)
      ? tabsEntry.tabs.filter((tab) => isObject(tab))
      : (Array.isArray(entry.tabs) ? entry.tabs.filter((tab) => isObject(tab)) : [])
  };
};

const normalizeWorkspaceSnapshotEntry = (pathname, entry = {}) => {
  const collections = Array.isArray(entry.collections) ? entry.collections.filter((collectionPathname) => typeof collectionPathname === 'string') : [];

  return {
    pathname,
    lastActiveCollectionPathname: typeof entry.lastActiveCollectionPathname === 'string'
      ? entry.lastActiveCollectionPathname
      : null,
    sorting: typeof entry.sorting === 'string' ? entry.sorting : 'default',
    collections
  };
};

export const hydrateSnapshotLookups = (snapshot = {}) => {
  const collectionsByPath = {};
  const tabsByCollectionPath = {};
  const collectionsByWorkspaceAndPath = {};
  const tabsByWorkspaceAndCollectionPath = {};
  const workspacesByPath = {};

  const setCollectionWorkspacePath = (collectionPathname, workspacePathname) => {
    const normalizedCollectionPathname = normalizePath(collectionPathname);
    if (!normalizedCollectionPathname) {
      return;
    }

    const matchingCollectionKey = Object.keys(collectionsByPath).find(
      (key) => normalizePath(key) === normalizedCollectionPathname
    );

    if (!matchingCollectionKey) {
      return;
    }

    collectionsByPath[matchingCollectionKey] = {
      ...collectionsByPath[matchingCollectionKey],
      workspacePathname
    };
  };

  if (Array.isArray(snapshot.collections)) {
    snapshot.collections.forEach((collectionEntry) => {
      if (!isObject(collectionEntry) || typeof collectionEntry.pathname !== 'string') {
        return;
      }

      const collection = normalizeCollectionSnapshotEntry(collectionEntry.pathname, collectionEntry);
      const normalizedCollectionPathname = normalizePath(collection.pathname);
      const workspaceCollectionKey = getWorkspaceCollectionSnapshotKey(
        collection.workspacePathname,
        collection.pathname
      );

      collectionsByPath[collection.pathname] = {
        pathname: collection.pathname,
        workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
        environment: collection.environment,
        environmentPath: collection.environmentPath,
        selectedEnvironment: collection.selectedEnvironment,
        isOpen: collection.isOpen,
        isMounted: collection.isMounted
      };

      tabsByCollectionPath[collection.pathname] = {
        pathname: collection.pathname,
        activeTab: collection.activeTab,
        tabs: collection.tabs
      };

      if (workspaceCollectionKey) {
        collectionsByWorkspaceAndPath[workspaceCollectionKey] = {
          pathname: collection.pathname,
          workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
          environment: collection.environment,
          environmentPath: collection.environmentPath,
          selectedEnvironment: collection.selectedEnvironment,
          isOpen: collection.isOpen,
          isMounted: collection.isMounted
        };

        tabsByWorkspaceAndCollectionPath[workspaceCollectionKey] = {
          pathname: collection.pathname,
          workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
          activeTab: collection.activeTab,
          tabs: collection.tabs
        };
      }

      if (normalizedCollectionPathname && !tabsByCollectionPath[normalizedCollectionPathname]) {
        tabsByCollectionPath[normalizedCollectionPathname] = {
          pathname: collection.pathname,
          activeTab: collection.activeTab,
          tabs: collection.tabs
        };
      }
    });
  }

  if (Array.isArray(snapshot.workspaces)) {
    snapshot.workspaces.forEach((workspaceEntry) => {
      if (!isObject(workspaceEntry) || typeof workspaceEntry.pathname !== 'string') {
        return;
      }

      const workspace = normalizeWorkspaceSnapshotEntry(workspaceEntry.pathname, workspaceEntry);
      workspacesByPath[workspace.pathname] = {
        pathname: workspace.pathname,
        lastActiveCollectionPathname: workspace.lastActiveCollectionPathname,
        sorting: workspace.sorting,
        collections: workspace.collections
      };

      workspace.collections.forEach((collectionPathname) => {
        setCollectionWorkspacePath(collectionPathname, workspace.pathname);
      });
    });
  }

  const normalizedCollectionsByPath = {};
  const normalizedTabsByCollectionPath = {};
  const normalizedCollectionsByWorkspaceAndPath = {};
  const normalizedTabsByWorkspaceAndCollectionPath = {};
  const normalizedWorkspacesByPath = {};

  Object.entries(collectionsByPath).forEach(([collectionPathname, collection]) => {
    normalizedCollectionsByPath[normalizePath(collectionPathname)] = {
      pathname: collectionPathname,
      ...collection
    };
  });

  Object.entries(tabsByCollectionPath).forEach(([collectionPathname, tabs]) => {
    normalizedTabsByCollectionPath[normalizePath(collectionPathname)] = {
      pathname: collectionPathname,
      ...tabs
    };
  });

  Object.entries(collectionsByWorkspaceAndPath).forEach(([workspaceCollectionKey, collection]) => {
    normalizedCollectionsByWorkspaceAndPath[workspaceCollectionKey] = {
      ...collection
    };
  });

  Object.entries(tabsByWorkspaceAndCollectionPath).forEach(([workspaceCollectionKey, tabs]) => {
    normalizedTabsByWorkspaceAndCollectionPath[workspaceCollectionKey] = {
      ...tabs
    };
  });

  Object.entries(workspacesByPath).forEach(([workspacePathname, workspace]) => {
    normalizedWorkspacesByPath[normalizePath(workspacePathname)] = {
      pathname: workspacePathname,
      ...workspace
    };
  });

  return {
    collectionsByPath: normalizedCollectionsByPath,
    tabsByCollectionPath: normalizedTabsByCollectionPath,
    collectionsByWorkspaceAndPath: normalizedCollectionsByWorkspaceAndPath,
    tabsByWorkspaceAndCollectionPath: normalizedTabsByWorkspaceAndCollectionPath,
    hasWorkspaceScopedTabs: Object.keys(normalizedTabsByWorkspaceAndCollectionPath).length > 0,
    workspacesByPath: normalizedWorkspacesByPath
  };
};

const getTabsSnapshotFromLookups = (
  collectionPathname,
  snapshotLookups = {},
  workspacePathname = null,
  strictWorkspaceScope = false
) => {
  const normalizedPathname = normalizePath(collectionPathname);
  if (!normalizedPathname) {
    return null;
  }

  if (workspacePathname) {
    const workspaceCollectionKey = getWorkspaceCollectionSnapshotKey(workspacePathname, collectionPathname);
    const workspaceTabsEntry = snapshotLookups?.tabsByWorkspaceAndCollectionPath?.[workspaceCollectionKey];
    if (workspaceTabsEntry) {
      return {
        activeTab: workspaceTabsEntry.activeTab,
        tabs: Array.isArray(workspaceTabsEntry.tabs) ? workspaceTabsEntry.tabs : []
      };
    }

    if (strictWorkspaceScope) {
      return {
        activeTab: null,
        tabs: []
      };
    }

    if (snapshotLookups?.hasWorkspaceScopedTabs) {
      return {
        activeTab: null,
        tabs: []
      };
    }

    if (isCollectionSharedAcrossWorkspaces(snapshotLookups, collectionPathname)) {
      return {
        activeTab: null,
        tabs: []
      };
    }
  }

  const tabsEntry = snapshotLookups?.tabsByCollectionPath?.[normalizedPathname];
  if (!tabsEntry) {
    return null;
  }

  return {
    activeTab: tabsEntry.activeTab,
    tabs: Array.isArray(tabsEntry.tabs) ? tabsEntry.tabs : []
  };
};

export const getCollectionEnvironmentPath = (collection, environment, defaultValue = null) => {
  if (!environment) {
    return defaultValue;
  }

  if (typeof environment.pathname === 'string' && environment.pathname.length > 0) {
    return normalizePath(environment.pathname);
  }

  if (!environment.name || !collection?.pathname) {
    return environment.name || defaultValue;
  }

  const extension = collection.format === 'yml' ? 'yml' : 'bru';
  return normalizePath(path.join(collection.pathname, 'environments', `${environment.name}.${extension}`));
};

export const findCollectionEnvironmentFromSnapshot = (collection, snapshotData = {}) => {
  const { environmentPath, selectedEnvironment } = snapshotData;

  const normalizedEnvironmentPath = normalizeSnapshotPathRef(environmentPath);

  if ((!normalizedEnvironmentPath && !selectedEnvironment) || !Array.isArray(collection?.environments)) {
    return null;
  }

  return collection.environments.find((environment) => {
    const environmentPathRef = normalizeSnapshotPathRef(environment?.pathname);

    if (normalizedEnvironmentPath && environmentPathRef === normalizedEnvironmentPath) {
      return true;
    }

    if (normalizedEnvironmentPath && environment?.uid === normalizedEnvironmentPath) {
      return true;
    }

    if (normalizedEnvironmentPath && environment?.name === normalizedEnvironmentPath) {
      return true;
    }

    return selectedEnvironment && environment?.name === selectedEnvironment;
  }) || null;
};

const getAccessor = (tab) => {
  if (tab.type === 'response-example') return 'pathname::exampleName';
  if (SINGLETON_TAB_TYPES.has(tab.type)) return 'type';
  return 'pathname';
};

export const serializeTab = (tab, collection) => {
  const accessor = getAccessor(tab);
  const serialized = {
    type: tab.type,
    accessor,
    permanent: !tab.preview
  };

  if (accessor === 'pathname') {
    const item = findItemInCollection(collection, tab.uid);
    serialized.pathname = item?.pathname || tab.pathname;
    if (item?.name || tab.name) {
      serialized.name = item?.name || tab.name;
    }
  } else if (accessor === 'pathname::exampleName') {
    const item = findItemInCollection(collection, tab.itemUid);
    serialized.pathname = item?.pathname || tab.pathname;
    serialized.exampleName = tab.exampleName;
    if (tab.name) {
      serialized.name = tab.name;
    }
  }

  const isRequest = isRequestTab(tab.type);
  if (isRequest && tab.requestPaneTab !== undefined) {
    serialized.request = {
      tab: tab.requestPaneTab,
      width: tab.requestPaneWidth,
      height: tab.requestPaneHeight
    };
  }

  if (isRequest && tab.responsePaneTab !== undefined) {
    serialized.response = {
      tab: tab.responsePaneTab,
      format: tab.responseFormat,
      viewTab: tab.responseViewTab
    };
  }

  return serialized;
};

export const serializeActiveTab = (tab, collection) => {
  if (!tab) return null;

  const accessor = getAccessor(tab);

  if (accessor === 'pathname') {
    const item = findItemInCollection(collection, tab.uid);
    return { accessor, value: item?.pathname || tab.pathname };
  }

  if (accessor === 'pathname::exampleName') {
    const item = findItemInCollection(collection, tab.itemUid);
    const pathname = item?.pathname || tab.pathname;
    return { accessor, value: `${pathname}::${tab.exampleName}` };
  }

  return { accessor: 'type', value: tab.type };
};

export const isActiveTab = (tab, activeTab, collection) => {
  if (!activeTab) return false;

  const { accessor, value } = activeTab;

  if (accessor === 'type') {
    return tab.type === value;
  }

  if (accessor === 'pathname') {
    const item = findItemInCollection(collection, tab.uid);
    return item?.pathname === value || tab.pathname === value;
  }

  if (accessor === 'pathname::exampleName') {
    const item = findItemInCollection(collection, tab.itemUid);
    const pathname = item?.pathname || tab.pathname;
    return `${pathname}::${tab.exampleName}` === value;
  }

  return false;
};

export const deserializeTab = (snapshotTab, collection) => {
  const { accessor, pathname, exampleName, type } = snapshotTab;

  const tab = {
    collectionUid: collection.uid,
    type,
    preview: !snapshotTab.permanent,
    name: snapshotTab.name || null,
    pathname: pathname || null,
    requestPaneTab: snapshotTab.request?.tab || 'params',
    requestPaneWidth: snapshotTab.request?.width || null,
    requestPaneHeight: snapshotTab.request?.height || null,
    responsePaneTab: snapshotTab.response?.tab || 'response',
    responseFormat: snapshotTab.response?.format || null,
    responseViewTab: snapshotTab.response?.viewTab || null,
    responsePaneScrollPosition: null,
    scriptPaneTab: null
  };

  if (accessor === 'pathname' && pathname) {
    const item = findItemInCollectionByPathname(collection, pathname);
    tab.uid = item?.uid || pathname;
    if (type === 'folder-settings') {
      tab.folderUid = item?.uid || pathname;
    }
  } else if (accessor === 'pathname::exampleName' && pathname && exampleName) {
    const item = findItemInCollectionByPathname(collection, pathname);
    const example = item?.examples?.find((ex) => ex.name === exampleName);
    tab.uid = example?.uid || `${pathname}::${exampleName}`;
    tab.itemUid = item?.uid || pathname;
    tab.exampleName = exampleName;
  } else if (accessor === 'type') {
    const collectionUidFromSnapshot = typeof snapshotTab.collection === 'string' && snapshotTab.collection.length > 0
      ? snapshotTab.collection
      : (typeof snapshotTab.collectionUid === 'string' && snapshotTab.collectionUid.length > 0
          ? snapshotTab.collectionUid
          : null);

    if (type === 'collection-settings') {
      tab.uid = collectionUidFromSnapshot || collection.uid;
    } else if (NON_REPLACEABLE_SINGLETON_TAB_TYPES.has(type)) {
      tab.uid = uuid();
    } else {
      tab.uid = type;
    }
  }

  return tab;
};

export const hydrateCollectionTabs = async (
  collection,
  dispatch,
  restoreTabs,
  snapshotLookups = null,
  workspacePathname = null,
  strictWorkspaceScope = false
) => {
  const { ipcRenderer } = window;

  const tabsSnapshot = getTabsSnapshotFromLookups(
    collection.pathname,
    snapshotLookups,
    workspacePathname,
    strictWorkspaceScope
  )
  || await ipcRenderer.invoke('renderer:snapshot:get-tabs', collection.pathname, workspacePathname).catch(() => null);

  const hasPersistedTabs = Array.isArray(tabsSnapshot?.tabs) && tabsSnapshot.tabs.length > 0;
  const hasPersistedActiveTab = Boolean(tabsSnapshot?.activeTab);
  const shouldRestoreEmptyWorkspaceScopedTabs = Boolean(workspacePathname) && (
    strictWorkspaceScope
    || Boolean(snapshotLookups?.hasWorkspaceScopedTabs)
    || isCollectionSharedAcrossWorkspaces(snapshotLookups, collection.pathname)
  );

  if (
    tabsSnapshot
    && Array.isArray(tabsSnapshot.tabs)
    && (hasPersistedTabs || hasPersistedActiveTab || shouldRestoreEmptyWorkspaceScopedTabs)
  ) {
    dispatch(restoreTabs({
      collection,
      tabs: tabsSnapshot.tabs,
      activeTab: tabsSnapshot.activeTab
    }));
  }
};

export const hydrateTabs = async (collections, dispatch, restoreTabs, snapshotLookups = null, workspacePathname = null) => {
  await Promise.all(
    collections.map((collection) => hydrateCollectionTabs(collection, dispatch, restoreTabs, snapshotLookups, workspacePathname))
  );
};

export const getActiveTabFromSnapshot = async (collectionPathname, collection, snapshotLookups = null, workspacePathname = null) => {
  const { ipcRenderer } = window;

  const tabsSnapshot = getTabsSnapshotFromLookups(collectionPathname, snapshotLookups, workspacePathname)
    || await ipcRenderer.invoke('renderer:snapshot:get-tabs', collectionPathname, workspacePathname).catch(() => null);

  if (!tabsSnapshot?.activeTab || !tabsSnapshot?.tabs?.length) return null;

  const { accessor, value } = tabsSnapshot.activeTab;
  let snapshotTab = null;

  if (accessor === 'type') {
    snapshotTab = tabsSnapshot.tabs.find((t) => t.type === value);
  } else if (accessor === 'pathname') {
    snapshotTab = tabsSnapshot.tabs.find((t) => t.pathname === value);
  } else if (accessor === 'pathname::exampleName') {
    snapshotTab = tabsSnapshot.tabs.find((t) => `${t.pathname}::${t.exampleName}` === value);
  }

  if (!snapshotTab) return null;

  return deserializeTab(snapshotTab, collection);
};
