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
  'global-environment-settings',
  'preferences',
  'workspaceOverview',
  'workspaceEnvironments',
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

  return snapshotLookups?.sharedCollectionPathnames?.has(normalizedCollectionPathname) ?? false;
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

  if (Array.isArray(snapshot.collections)) {
    snapshot.collections.forEach((collectionEntry) => {
      if (!isObject(collectionEntry) || typeof collectionEntry.pathname !== 'string') {
        return;
      }

      const collection = normalizeCollectionSnapshotEntry(collectionEntry.pathname, collectionEntry);
      const normalizedCollectionPathname = normalizePath(collection.pathname);
      if (!normalizedCollectionPathname) {
        return;
      }

      const workspaceCollectionKey = getWorkspaceCollectionSnapshotKey(
        collection.workspacePathname,
        collection.pathname
      );

      collectionsByPath[normalizedCollectionPathname] = {
        pathname: collection.pathname,
        workspacePathname: typeof collection.workspacePathname === 'string' ? collection.workspacePathname : '',
        environment: collection.environment,
        environmentPath: collection.environmentPath,
        selectedEnvironment: collection.selectedEnvironment,
        isOpen: collection.isOpen,
        isMounted: collection.isMounted
      };

      tabsByCollectionPath[normalizedCollectionPathname] = {
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
    });
  }

  const collectionWorkspaceCounts = new Map();

  if (Array.isArray(snapshot.workspaces)) {
    snapshot.workspaces.forEach((workspaceEntry) => {
      if (!isObject(workspaceEntry) || typeof workspaceEntry.pathname !== 'string') {
        return;
      }

      const workspace = normalizeWorkspaceSnapshotEntry(workspaceEntry.pathname, workspaceEntry);
      const normalizedWorkspacePath = normalizePath(workspace.pathname);
      if (!normalizedWorkspacePath) {
        return;
      }

      workspacesByPath[normalizedWorkspacePath] = {
        pathname: workspace.pathname,
        lastActiveCollectionPathname: workspace.lastActiveCollectionPathname,
        sorting: workspace.sorting,
        collections: workspace.collections
      };

      workspace.collections.forEach((collectionPathname) => {
        const normalizedCollectionPath = normalizePath(collectionPathname);
        if (!normalizedCollectionPath) {
          return;
        }

        if (collectionsByPath[normalizedCollectionPath]) {
          collectionsByPath[normalizedCollectionPath] = {
            ...collectionsByPath[normalizedCollectionPath],
            workspacePathname: workspace.pathname
          };
        }

        collectionWorkspaceCounts.set(
          normalizedCollectionPath,
          (collectionWorkspaceCounts.get(normalizedCollectionPath) || 0) + 1
        );
      });
    });
  }

  const sharedCollectionPathnames = new Set();
  collectionWorkspaceCounts.forEach((count, normalizedPath) => {
    if (count > 1) sharedCollectionPathnames.add(normalizedPath);
  });

  return {
    collectionsByPath,
    tabsByCollectionPath,
    collectionsByWorkspaceAndPath,
    tabsByWorkspaceAndCollectionPath,
    hasWorkspaceScopedTabs: Object.keys(tabsByWorkspaceAndCollectionPath).length > 0,
    sharedCollectionPathnames,
    workspacesByPath
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
  if (tab.type === 'response-example') return 'pathname::exampleIndex';
  if (SINGLETON_TAB_TYPES.has(tab.type)) return 'type';
  return 'pathname';
};

const getDefaultRequestPaneTabForType = (type) => {
  if (type === 'grpc-request' || type === 'ws-request') {
    return 'body';
  }

  if (type === 'graphql-request') {
    return 'query';
  }

  return 'params';
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
    const exampleIndex = item?.examples?.findIndex((example) => example.uid === tab.uid);
    if (typeof exampleIndex === 'number' && exampleIndex >= 0) {
      serialized.exampleIndex = exampleIndex;
    }
    serialized.exampleUid = tab.uid;
    if (tab.name) {
      serialized.name = tab.name;
    }
  } else if (accessor === 'pathname::exampleIndex') {
    const item = findItemInCollection(collection, tab.itemUid);
    serialized.pathname = item?.pathname || tab.pathname;
    const exampleIndex = item?.examples?.findIndex((example) => example.uid === tab.uid);
    if (typeof exampleIndex === 'number' && exampleIndex >= 0) {
      serialized.exampleIndex = exampleIndex;
    }
    serialized.exampleName = tab.exampleName;
    serialized.exampleUid = tab.uid;
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

  if (accessor === 'pathname::exampleIndex') {
    const item = findItemInCollection(collection, tab.itemUid);
    const pathname = item?.pathname || tab.pathname;
    const exampleIndex = item?.examples?.findIndex((example) => example.uid === tab.uid);

    if (typeof exampleIndex === 'number' && exampleIndex >= 0) {
      return { accessor, value: `${pathname}::${exampleIndex}` };
    }

    if (tab.exampleName) {
      return { accessor: 'pathname::exampleName', value: `${pathname}::${tab.exampleName}` };
    }

    return { accessor, value: `${pathname}::-1` };
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
    return tab.type !== 'response-example' && (item?.pathname === value || tab.pathname === value);
  }

  if (accessor === 'pathname::exampleName') {
    const item = findItemInCollection(collection, tab.itemUid);
    const pathname = item?.pathname || tab.pathname;
    return `${pathname}::${tab.exampleName}` === value;
  }

  if (accessor === 'pathname::exampleIndex') {
    const item = findItemInCollection(collection, tab.itemUid);
    const pathname = item?.pathname || tab.pathname;
    const exampleIndex = item?.examples?.findIndex((example) => example.uid === tab.uid);

    return `${pathname}::${exampleIndex}` === value;
  }

  return false;
};

const resolveResponseExampleTabState = ({ item, pathname, exampleName, exampleIndex, exampleUid }) => {
  const hasExamples = Array.isArray(item?.examples);
  const hasProvidedExampleIndex = typeof exampleIndex === 'number' && exampleIndex >= 0;
  const hasValidExampleIndex = hasExamples && hasProvidedExampleIndex && exampleIndex < item.examples.length;

  let resolvedExample = null;
  if (hasExamples) {
    if (hasValidExampleIndex) {
      resolvedExample = item.examples[exampleIndex] || null;
    } else {
      if (typeof exampleUid === 'string' && exampleUid.length > 0) {
        resolvedExample = item.examples.find((ex) => ex.uid === exampleUid) || null;
      }

      if (!resolvedExample && exampleName) {
        resolvedExample = item.examples.find((ex) => ex.name === exampleName) || null;
      }
    }
  }

  const resolvedExampleIndex = hasExamples && resolvedExample?.uid
    ? item.examples.findIndex((ex) => ex.uid === resolvedExample.uid)
    : -1;

  const fallbackExampleIdentity = hasProvidedExampleIndex
    ? `${pathname}::${exampleIndex}`
    : `${pathname}::${exampleName}`;

  let normalizedExampleIndex = null;
  if (resolvedExampleIndex >= 0) {
    normalizedExampleIndex = resolvedExampleIndex;
  } else if (hasProvidedExampleIndex) {
    normalizedExampleIndex = exampleIndex;
  }

  return {
    uid: resolvedExample?.uid || fallbackExampleIdentity,
    itemUid: item?.uid || pathname,
    exampleName: resolvedExample?.name || exampleName,
    exampleIndex: normalizedExampleIndex
  };
};

export const deserializeTab = (snapshotTab, collection) => {
  const { accessor, pathname, exampleName, exampleIndex, exampleUid, type } = snapshotTab;
  const restoredRequestPaneTab = typeof snapshotTab.request?.tab === 'string' ? snapshotTab.request.tab : null;

  const tab = {
    collectionUid: collection.uid,
    type,
    preview: !snapshotTab.permanent,
    name: snapshotTab.name || null,
    pathname: pathname || null,
    requestPaneTab: restoredRequestPaneTab || getDefaultRequestPaneTabForType(type),
    requestPaneWidth: snapshotTab.request?.width || null,
    requestPaneHeight: snapshotTab.request?.height || null,
    responsePaneTab: snapshotTab.response?.tab || 'response',
    responseFormat: snapshotTab.response?.format || null,
    responseViewTab: snapshotTab.response?.viewTab || null,
    responsePaneScrollPosition: null,
    scriptPaneTab: null
  };

  const isCollectionScopedSingleton = type === 'preferences'
    || type === 'environment-settings'
    || type === 'global-environment-settings';

  const needsTypeBasedFallback = accessor === 'type' || (accessor === 'pathname' && !pathname && isCollectionScopedSingleton);

  if (accessor === 'pathname' && pathname) {
    const item = findItemInCollectionByPathname(collection, pathname);
    const resolvedType = item?.type || type;
    tab.type = resolvedType;
    if (!restoredRequestPaneTab) {
      tab.requestPaneTab = getDefaultRequestPaneTabForType(resolvedType);
    }
    tab.uid = item?.uid || pathname;
    if (type === 'folder-settings') {
      tab.folderUid = item?.uid || pathname;
    }
  } else if ((accessor === 'pathname::exampleName' || accessor === 'pathname::exampleIndex') && pathname) {
    const item = findItemInCollectionByPathname(collection, pathname);
    const resolvedTabState = resolveResponseExampleTabState({ item, pathname, exampleName, exampleIndex, exampleUid });
    tab.uid = resolvedTabState.uid;
    tab.itemUid = resolvedTabState.itemUid;
    tab.exampleName = resolvedTabState.exampleName;
    tab.exampleIndex = resolvedTabState.exampleIndex;
  } else if (needsTypeBasedFallback) {
    const collectionUidFromSnapshot = typeof snapshotTab.collection === 'string' && snapshotTab.collection.length > 0
      ? snapshotTab.collection
      : (typeof snapshotTab.collectionUid === 'string' && snapshotTab.collectionUid.length > 0
          ? snapshotTab.collectionUid
          : null);

    if (type === 'collection-settings') {
      tab.uid = collectionUidFromSnapshot || collection.uid;
    } else if (type === 'preferences') {
      tab.uid = `${collection.uid}-preferences`;
    } else if (type === 'environment-settings') {
      tab.uid = `${collection.uid}-environment-settings`;
    } else if (type === 'global-environment-settings') {
      tab.uid = `${collection.uid}-global-environment-settings`;
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
    snapshotTab = tabsSnapshot.tabs.find((t) => t.pathname === value && t.type !== 'response-example');
  } else if (accessor === 'pathname::exampleName') {
    snapshotTab = tabsSnapshot.tabs.find((t) => `${t.pathname}::${t.exampleName}` === value);
  } else if (accessor === 'pathname::exampleIndex') {
    snapshotTab = tabsSnapshot.tabs.find((t) => `${t.pathname}::${t.exampleIndex}` === value);

    if (!snapshotTab) {
      const [pathname, rawIndex] = value.split('::');
      const exampleIndex = Number(rawIndex);
      if (pathname && Number.isInteger(exampleIndex) && exampleIndex >= 0) {
        const candidateTabs = tabsSnapshot.tabs.filter((t) => t.type === 'response-example' && t.pathname === pathname);
        snapshotTab = candidateTabs[exampleIndex] || null;
      }
    }
  }

  if (!snapshotTab) return null;

  return deserializeTab(snapshotTab, collection);
};
