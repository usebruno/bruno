import {
  shouldExcludeTab,
  serializeTab,
  serializeActiveTab,
  getCollectionEnvironmentPath,
  WORKSPACE_TAB_TYPES
} from 'utils/snapshot';
import { normalizePath } from 'utils/common/path';
import { API_SPEC_TAB_TYPE } from 'utils/api-specs';
import isEqual from 'lodash/isEqual';
import { getNextSnapshotRevision } from './snapshotRevision';

const COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING = {
  default: 'default',
  alphabetical: 'alphabetical',
  reverseAlphabetical: 'reverseAlphabetical'
};

const normalizeCollectionSortOrder = (sortOrder) => {
  return COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING[sortOrder] || 'default';
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

/** True when every key in patch (except preserveEnvironment) matches existing. */
const isPatchEqualToExisting = (patch, existing) => {
  if (isPlainObject(patch)) {
    if (!isPlainObject(existing)) {
      return false;
    }

    return Object.keys(patch)
      .filter((key) => key !== 'preserveEnvironment')
      .every((key) => (
        Object.prototype.hasOwnProperty.call(existing, key)
        && isPatchEqualToExisting(patch[key], existing[key])
      ));
  }

  return isEqual(patch, existing);
};

const getWorkspaceByPath = (snapshot, pathname) => {
  const normalizedPathname = normalizePath(pathname || '');
  return (snapshot?.workspaces || []).find(
    (workspace) => normalizePath(workspace.pathname || '') === normalizedPathname
  );
};

const getCollectionByKey = (snapshot, workspacePathname, collectionPathname) => {
  const normalizedWorkspacePathname = normalizePath(workspacePathname || '');
  const normalizedCollectionPathname = normalizePath(collectionPathname || '');
  return (snapshot?.collections || []).find((collection) => (
    normalizePath(collection.workspacePathname || '') === normalizedWorkspacePathname
    && normalizePath(collection.pathname || '') === normalizedCollectionPathname
  ));
};

const shouldPreserveCollectionEnvironmentInPatch = (
  collection,
  environmentPathFromRedux,
  selectedEnvironmentFromRedux
) => {
  const hasAuthoritativeReduxEnvironment = Boolean(
    selectedEnvironmentFromRedux || environmentPathFromRedux
  );

  if (hasAuthoritativeReduxEnvironment) {
    return false;
  }

  const isCollectionEnvironmentHydrated = collection.mountStatus === 'mounted'
    && Array.isArray(collection.environments)
    && collection.environments.length > 0;

  return collection.mountStatus !== 'mounted' || !isCollectionEnvironmentHydrated;
};

/**
 * Build a partial snapshot patch for the active workspace from Redux state.
 * Main process merges this into the persisted snapshot.
 */
export const buildSnapshotDelta = (state, previousSnapshot = null) => {
  const { workspaces, collections, tabs, logs, globalEnvironments } = state;
  const snapshotHydration = state.app?.snapshotHydration;
  const activeWorkspaceCollectionSortOrder = normalizeCollectionSortOrder(collections.collectionSortOrder);

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

  const pendingHydrationPaths = new Set(
    (snapshotHydration?.pendingCollectionPathnames || []).map((pathname) => normalizePath(pathname))
  );

  const resolvedDevToolsActiveTab = logs.activeTab ?? 'terminal';

  const patch = {
    version: '0.0.1',
    revision: getNextSnapshotRevision(),
    activeWorkspacePath: activeWorkspace?.pathname || null,
    extras: {
      devTools: {
        open: logs.isConsoleOpen,
        activeTab: resolvedDevToolsActiveTab,
        tabs: {
          [resolvedDevToolsActiveTab]: {}
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

  if (activeWorkspace?.pathname) {
    const workspaceCollectionPaths = (activeWorkspace.collections || []).map((c) => c.path).filter(Boolean);
    const normalizedWorkspacePaths = workspaceCollectionPaths.map((p) => normalizePath(p));

    const activeTab = tabs.tabs.find((t) => t.uid === tabs.activeTabUid);
    const activeCollection = activeTab
      ? (collections.collections || []).find((c) => c.uid === activeTab.collectionUid)
      : null;
    const normalizedPathname = activeCollection?.pathname ? normalizePath(activeCollection.pathname) : null;

    const lastActiveCollectionPathname = normalizedPathname && normalizedWorkspacePaths.includes(normalizedPathname)
      ? normalizedPathname
      : null;

    let activeWorkspaceTabType = null;
    let apiSpecTabs = [];
    let activeApiSpecTabPathname = null;

    if (
      activeTab
      && activeWorkspace.scratchCollectionUid
      && activeTab.collectionUid === activeWorkspace.scratchCollectionUid
      && WORKSPACE_TAB_TYPES.has(activeTab.type)
    ) {
      activeWorkspaceTabType = activeTab.type;
    }

    if (activeWorkspace.scratchCollectionUid) {
      apiSpecTabs = tabs.tabs
        .filter((t) => (
          t.collectionUid === activeWorkspace.scratchCollectionUid
          && t.type === API_SPEC_TAB_TYPE
          && t.apiSpecPathname
        ))
        .map((t) => normalizePath(t.apiSpecPathname));

      if (
        activeTab
        && activeTab.collectionUid === activeWorkspace.scratchCollectionUid
        && activeTab.type === API_SPEC_TAB_TYPE
        && activeTab.apiSpecPathname
      ) {
        activeApiSpecTabPathname = normalizePath(activeTab.apiSpecPathname);
      }
    }

    patch.workspaces.push({
      pathname: activeWorkspace.pathname,
      environment: '',
      lastActiveCollectionPathname,
      sorting: activeWorkspaceCollectionSortOrder,
      activeWorkspaceTabType,
      apiSpecTabs,
      activeApiSpecTabPathname,
      collections: [...workspaceCollectionPaths]
    });

    (collections.collections || []).forEach((collection) => {
      if (!collection.pathname || scratchCollectionUids.has(collection.uid)) {
        return;
      }

      const normalizedPath = normalizePath(collection.pathname);

      if (!activeWorkspaceCollectionPaths.has(normalizedPath)) {
        return;
      }

      if (pendingHydrationPaths.has(normalizedPath)) {
        return;
      }

      const workspacePathname = activeWorkspace.pathname || '';
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

      const collectionPatch = {
        pathname: collection.pathname,
        workspacePathname,
        isOpen: !collection.collapsed,
        isMounted: collection.mountStatus === 'mounted',
        activeTab: serializeActiveTab(activeTabInCollection, collection),
        tabs: collectionTabs,
        environment: {
          collection: environmentPathFromRedux || '',
          global: globalEnvironments.activeGlobalEnvironmentUid || ''
        },
        environmentPath: environmentPathFromRedux || '',
        selectedEnvironment: selectedEnvironmentFromRedux
      };

      if (shouldPreserveCollectionEnvironmentInPatch(
        collection,
        environmentPathFromRedux,
        selectedEnvironmentFromRedux
      )) {
        collectionPatch.preserveEnvironment = true;
      }

      patch.collections.push(collectionPatch);
    });
  }

  if (!previousSnapshot) {
    return patch;
  }

  const delta = {
    revision: patch.revision
  };

  if (!isEqual(patch.activeWorkspacePath, previousSnapshot.activeWorkspacePath)) {
    delta.activeWorkspacePath = patch.activeWorkspacePath;
  }

  const previousWorkspace = getWorkspaceByPath(previousSnapshot, activeWorkspace?.pathname);
  const changedWorkspaces = patch.workspaces.filter((workspace) => (
    !previousWorkspace || !isPatchEqualToExisting(workspace, previousWorkspace)
  ));
  if (changedWorkspaces.length > 0) {
    delta.workspaces = changedWorkspaces;
  }

  const changedCollections = patch.collections.filter((collection) => {
    const previousCollection = getCollectionByKey(
      previousSnapshot,
      collection.workspacePathname,
      collection.pathname
    );
    return !previousCollection || !isPatchEqualToExisting(collection, previousCollection);
  });
  if (changedCollections.length > 0) {
    delta.collections = changedCollections;
  }

  const extras = {};
  const previousExtras = previousSnapshot.extras || {};
  const previousDevTools = previousExtras.devTools || {};
  const devTools = patch.extras?.devTools;

  if (
    devTools
    && (
      !isPatchEqualToExisting(
        { open: devTools.open, activeTab: devTools.activeTab },
        previousDevTools
      )
      || (
        devTools.activeTab
        && !Object.prototype.hasOwnProperty.call(previousDevTools.tabs || {}, devTools.activeTab)
      )
    )
  ) {
    extras.devTools = {
      open: devTools.open,
      activeTab: devTools.activeTab
    };

    if (
      devTools.activeTab
      && !Object.prototype.hasOwnProperty.call(previousDevTools.tabs || {}, devTools.activeTab)
    ) {
      extras.devTools.tabs = {
        [devTools.activeTab]: {}
      };
    }
  }

  const sidebar = patch.extras?.sidebar;
  if (sidebar && !isPatchEqualToExisting(sidebar, previousExtras.sidebar)) {
    extras.sidebar = sidebar;
  }

  if (Object.keys(extras).length > 0) {
    delta.extras = extras;
  }

  return delta;
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

export { shouldPreserveCollectionEnvironmentInSnapshot };
