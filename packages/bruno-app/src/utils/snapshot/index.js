import { findItemInCollection, findItemInCollectionByPathname } from 'utils/collections';

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

export const hydrateTabs = async (collections, dispatch, restoreTabs) => {
  const { ipcRenderer } = window;

  await Promise.all(
    collections.map(async (collection) => {
      const collectionSnapshot = await ipcRenderer.invoke('renderer:get-collection-snapshot', collection.pathname).catch(() => null);
      if (collectionSnapshot?.tabs?.length > 0) {
        dispatch(restoreTabs({
          collection,
          tabs: collectionSnapshot.tabs,
          activeTab: collectionSnapshot.activeTab
        }));
      }
    })
  );
};

export const getActiveTabFromSnapshot = async (collectionPathname, collection) => {
  const { ipcRenderer } = window;

  const collectionSnapshot = await ipcRenderer.invoke('renderer:get-collection-snapshot', collectionPathname).catch(() => null);
  if (!collectionSnapshot?.activeTab || !collectionSnapshot?.tabs?.length) return null;

  const { accessor, value } = collectionSnapshot.activeTab;
  let snapshotTab = null;

  if (accessor === 'type') {
    snapshotTab = collectionSnapshot.tabs.find((t) => t.type === value);
  } else if (accessor === 'pathname') {
    snapshotTab = collectionSnapshot.tabs.find((t) => t.pathname === value);
  } else if (accessor === 'pathname::exampleName') {
    snapshotTab = collectionSnapshot.tabs.find((t) => `${t.pathname}::${t.exampleName}` === value);
  }

  if (!snapshotTab) return null;

  return deserializeTab(snapshotTab, collection);
};
