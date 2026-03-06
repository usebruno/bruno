import { findItemInCollection, isScratchCollection } from 'utils/collections';
import { CURRENT_VERSION, validateSnapshot, safeValidateSnapshot, loadAndMigrateSnapshot } from './schema';

export { CURRENT_VERSION, validateSnapshot, safeValidateSnapshot, loadAndMigrateSnapshot };

export const serializeTab = (tab, collection, preferences) => {
  const item = findItemInCollection(collection, tab.uid);
  if (item) {
    return {
      type: tab.type,
      uid: tab.uid,
      permanent: !tab.preview,
      layout: preferences?.layout?.responsePaneOrientation === 'vertical' ? 'vertical' : 'horizontal',
      request: {
        tab: tab.requestPaneTab || null,
        width: tab.requestPaneWidth || 0,
        height: tab.requestPaneHeight || 0
      },
      response: {
        tab: tab.responsePaneTab || 'response',
        format: tab.responseFormat || null,
        preview: tab.responseViewTab === 'preview'
      }
    };
  }
  return {
    type: tab.type,
    uid: tab.uid,
    permanent: !tab.preview
  };
};

export const serializeDevTools = (logsState, devtoolsHeight) => ({
  open: logsState.isConsoleOpen || false,
  tab: logsState.activeTab || 'console',
  height: devtoolsHeight || 300
});

export const deserializeTab = (tabSchema, collection) => {
  const { type, uid, permanent, request, response } = tabSchema;

  return {
    type,
    uid,
    collectionUid: collection.uid,
    preview: !permanent,
    ...(type === 'folder-settings' && { folderUid: uid }),
    ...(request?.tab !== undefined && { requestPaneTab: request.tab }),
    ...(request?.width !== undefined && { requestPaneWidth: request.width }),
    ...(request?.height !== undefined && { requestPaneHeight: request.height }),
    ...(response?.tab !== undefined && { responsePaneTab: response.tab }),
    ...(response?.format !== undefined && { responseFormat: response.format }),
    ...(response?.preview !== undefined && { responseViewTab: response.preview ? 'preview' : 'editor' })
  };
};

export const deserializeDevTools = (schema) => ({
  isConsoleOpen: schema?.open ?? false,
  activeTab: schema?.tab ?? 'console',
  devtoolsHeight: schema?.height ?? 300
});

export const restoreTabsForCollection = (collection, tabSchemas) => {
  if (!collection || !tabSchemas?.length) return [];
  return tabSchemas.map((schema) => deserializeTab(schema, collection)).filter(Boolean);
};

export const serializeAppSnapshot = (state) => {
  const { collections: collectionsState, tabs: tabsState, workspaces: workspacesState, logs: logsState, app: appState, preferences } = state;
  const collections = collectionsState.collections || [];
  const tabs = tabsState.tabs || [];
  const activeTabUid = tabsState.activeTabUid;
  const workspaces = workspacesState.workspaces || [];
  const activeWorkspaceUid = workspacesState.activeWorkspaceUid;
  const deferredSnapshots = appState.deferredWorkspaceSnapshots || {};

  const scratchCollectionUids = new Set(collections.filter((c) => isScratchCollection(c, workspaces)).map((c) => c.uid));
  const nonScratchCollections = collections.filter((c) => !scratchCollectionUids.has(c.uid));

  // Group tabs by collection (excluding scratch collections)
  const tabsByCollection = {};
  for (const tab of tabs) {
    if (scratchCollectionUids.has(tab.collectionUid)) continue;
    (tabsByCollection[tab.collectionUid] ??= []).push(tab);
  }

  // Serialize mounted collections
  const serializedCollections = nonScratchCollections.map((collection) => {
    const collectionTabs = tabsByCollection[collection.uid] || [];
    const serializedTabs = collectionTabs.map((tab) => serializeTab(tab, collection, preferences)).filter(Boolean);
    const activeIdx = activeTabUid ? collectionTabs.findIndex((t) => t.uid === activeTabUid) : -1;

    return {
      pathname: collection.pathname,
      isMounted: collection.mountStatus === 'mounted',
      isOpen: !collection.collapsed,
      environment: collection.environments?.find((e) => e.uid === collection.activeEnvironmentUid)?.name ?? null,
      tabs: serializedTabs,
      activeTabIndex: activeIdx !== -1 ? activeIdx : 0
    };
  });

  // Merge deferred collections (from inactive workspaces) that aren't already serialized
  const serializedPaths = new Set(serializedCollections.map((c) => c.pathname));
  const deferredCollections = Object.values(deferredSnapshots)
    .flatMap((snapshot) => snapshot.collections || [])
    .filter((col) => !serializedPaths.has(col.pathname));

  const allCollections = [...serializedCollections, ...deferredCollections];

  // Serialize workspaces
  const serializedWorkspaces = workspaces.map((workspace) => {
    const deferred = deferredSnapshots[workspace.pathname];
    if (deferred?.collections) {
      return {
        pathname: workspace.pathname,
        collections: deferred.collections.map((c) => ({ ...c, isMounted: false }))
      };
    }

    const workspacePaths = (workspace.collections || []).map((c) => c.path);
    return {
      pathname: workspace.pathname,
      collections: serializedCollections.filter((c) => workspacePaths.includes(c.pathname))
    };
  });

  return {
    version: CURRENT_VERSION,
    activeWorkspacePathname: workspaces.find((w) => w.uid === activeWorkspaceUid)?.pathname ?? null,
    workspaces: serializedWorkspaces,
    collections: allCollections,
    extras: {
      devTools: serializeDevTools(logsState, logsState.devtoolsHeight || 300)
    }
  };
};
