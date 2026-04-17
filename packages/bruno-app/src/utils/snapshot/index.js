import { findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';
import path, { normalizePath } from 'utils/common/path';

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

  const extension = collection.brunoConfig?.version === '1' ? 'bru' : 'yml';
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
    tab.uid = type;
  }

  return tab;
};

export const hydrateCollectionTabs = async (collection, dispatch, restoreTabs) => {
  const { ipcRenderer } = window;

  const tabsSnapshot = await ipcRenderer.invoke('renderer:snapshot:get-tabs', collection.pathname).catch(() => null);
  if (tabsSnapshot?.tabs?.length > 0) {
    dispatch(restoreTabs({
      collection,
      tabs: tabsSnapshot.tabs,
      activeTab: tabsSnapshot.activeTab
    }));
  }
};

export const hydrateTabs = async (collections, dispatch, restoreTabs) => {
  await Promise.all(
    collections.map((collection) => hydrateCollectionTabs(collection, dispatch, restoreTabs))
  );
};

export const getActiveTabFromSnapshot = async (collectionPathname, collection) => {
  const { ipcRenderer } = window;

  const tabsSnapshot = await ipcRenderer.invoke('renderer:snapshot:get-tabs', collectionPathname).catch(() => null);
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
