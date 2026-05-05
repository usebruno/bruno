import path from 'utils/common/path';
import {
  createWorkspace,
  removeWorkspace,
  setActiveWorkspace,
  updateWorkspace,
  removeCollectionFromWorkspace,
  updateWorkspaceLoadingState,
  setWorkspaceScratchCollection
} from '../workspaces';
import { createCollection, openCollection, openMultipleCollections, openScratchCollectionEvent, mountCollection } from '../collections/actions';
import { removeCollection, addTransientDirectory, updateCollectionMountStatus, expandCollection, sortCollections } from '../collections';
import { sanitizeName } from 'utils/common/regex';
import { clearCollectionState } from '../openapi-sync';
import { updateGlobalEnvironments } from '../global-environments';
import { addTab, restoreTabs } from '../tabs';
import {
  setSnapshotReady,
  startSnapshotHydrationSession,
  markSnapshotCollectionHydrated,
  clearSnapshotHydrationSession
} from '../app';
import { openConsole, closeConsole, setActiveTab as setActiveDevToolsTab, TAB_IDENFIERS as DEVTOOL_TABS } from '../logs';
import { normalizePath } from 'utils/common/path';
import { hydrateTabs, getActiveTabFromSnapshot, hydrateSnapshotLookups } from 'utils/snapshot';
import toast from 'react-hot-toast';

const { ipcRenderer } = window;
let snapshotHydrationTimer = null;
const SNAPSHOT_HYDRATION_TIMEOUT_MS = 10000;

const COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING = {
  default: 'default',
  alphabetical: 'alphabetical',
  reverseAlphabetical: 'reverseAlphabetical'
};

const normalizeCollectionSortOrder = (sorting) => {
  return COLLECTION_SORT_ORDER_BY_WORKSPACE_SORTING[sorting] || 'default';
};

const clearSnapshotHydrationTimeout = () => {
  if (snapshotHydrationTimer) {
    clearTimeout(snapshotHydrationTimer);
    snapshotHydrationTimer = null;
  }
};

const transformCollection = async (collection, type) => {
  switch (type) {
    case 'bruno': {
      const { processBrunoCollection } = await import('utils/importers/bruno-collection');
      return processBrunoCollection(collection);
    }
    case 'postman': {
      const { postmanToBruno } = await import('utils/importers/postman-collection');
      return postmanToBruno(collection);
    }
    case 'insomnia': {
      const { convertInsomniaToBruno } = await import('utils/importers/insomnia-collection');
      return convertInsomniaToBruno(collection);
    }
    case 'openapi': {
      const { convertOpenapiToBruno } = await import('utils/importers/openapi-collection');
      return convertOpenapiToBruno(collection);
    }
    case 'opencollection': {
      const { processOpenCollection } = await import('utils/importers/opencollection');
      return processOpenCollection(collection);
    }
    case 'wsdl': {
      const { wsdlToBruno } = await import('@usebruno/converters');
      return wsdlToBruno(collection);
    }
    default:
      throw new Error(`Unsupported collection type: ${type}`);
  }
};

/**
 * Creates a temporary workspace in Redux without touching the filesystem.
 * The workspace is only persisted to disk when the user confirms the name.
 */
export const createWorkspaceWithUniqueName = (location) => {
  return async (dispatch) => {
    const { uuid: generateUuid } = await import('utils/common');
    const tempUid = generateUuid();
    const name = await ipcRenderer?.invoke('renderer:find-unique-folder-name', 'Untitled Workspace', location) || 'Untitled Workspace';

    dispatch(createWorkspace({
      uid: tempUid,
      name,
      pathname: null,
      collections: [],
      isCreating: true,
      creationLocation: location
    }));

    dispatch(updateWorkspace({ uid: tempUid, isNewlyCreated: true }));
    await dispatch(switchWorkspace(tempUid));

    return { workspaceUid: tempUid };
  };
};

/**
 * Confirms creation of a temporary workspace by persisting it to the filesystem.
 */
export const confirmWorkspaceCreation = (tempWorkspaceUid, workspaceName) => {
  return async (dispatch, getState) => {
    const tempWorkspace = getState().workspaces.workspaces.find((w) => w.uid === tempWorkspaceUid);
    if (!tempWorkspace) {
      throw new Error('Temporary workspace not found');
    }

    const location = tempWorkspace.creationLocation;
    if (!location) {
      throw new Error('Workspace creation location not found');
    }

    const baseFolderName = sanitizeName(workspaceName);
    const folderName = await ipcRenderer?.invoke('renderer:find-unique-folder-name', baseFolderName, location) || baseFolderName;

    const result = await ipcRenderer.invoke(
      'renderer:create-workspace',
      workspaceName,
      folderName,
      location
    );

    const { workspaceUid: realUid, workspacePath, workspaceConfig } = result;

    // Clean up the temp workspace's scratch collection after IPC succeeds
    // (doing it before would leave a broken state if the IPC call fails)
    if (tempWorkspace.scratchCollectionUid) {
      dispatch(removeCollection({ collectionUid: tempWorkspace.scratchCollectionUid }));
    }

    // Remove the temporary workspace
    dispatch(removeWorkspace(tempWorkspaceUid));

    // Ensure the real workspace exists in Redux (the workspace-opened event may or may not have fired yet)
    const existing = getState().workspaces.workspaces.find((w) => w.uid === realUid);
    if (!existing) {
      dispatch(createWorkspace({
        uid: realUid,
        pathname: workspacePath,
        ...workspaceConfig
      }));
    }

    dispatch(updateWorkspace({ uid: realUid, name: workspaceName }));

    await dispatch(switchWorkspace(realUid));

    return result;
  };
};

/**
 * Cancels creation of a temporary workspace, removing it from Redux.
 * Only switches to default workspace if the temp workspace was the active one.
 */
export const cancelWorkspaceCreation = (tempWorkspaceUid) => {
  return async (dispatch, getState) => {
    const tempWorkspace = getState().workspaces.workspaces.find((w) => w.uid === tempWorkspaceUid);
    if (!tempWorkspace) return;

    // Clean up the scratch collection if one was mounted
    if (tempWorkspace.scratchCollectionUid) {
      dispatch(removeCollection({ collectionUid: tempWorkspace.scratchCollectionUid }));
    }

    const wasActive = getState().workspaces.activeWorkspaceUid === tempWorkspaceUid;
    dispatch(removeWorkspace(tempWorkspaceUid));

    // Only switch to default if the cancelled workspace was the active one
    if (wasActive) {
      const defaultWorkspace = getState().workspaces.workspaces.find((w) => w.type === 'default');
      if (defaultWorkspace) {
        await dispatch(switchWorkspace(defaultWorkspace.uid));
      }
    }
  };
};

export const createWorkspaceAction = (workspaceName, workspaceFolderName, workspaceLocation) => {
  return async (dispatch) => {
    try {
      const result = await ipcRenderer.invoke('renderer:create-workspace',
        workspaceName,
        workspaceFolderName,
        workspaceLocation);

      const { workspaceConfig, workspaceUid, workspacePath } = result;

      dispatch(createWorkspace({
        uid: workspaceUid,
        name: workspaceName,
        pathname: workspacePath,
        ...workspaceConfig
      }));

      await dispatch(switchWorkspace(workspaceUid));

      return result;
    } catch (error) {
      throw error;
    }
  };
};

export const openWorkspace = () => {
  return async (dispatch) => {
    try {
      const workspacePath = await ipcRenderer.invoke('renderer:browse-directory');
      if (workspacePath) {
        const result = await ipcRenderer.invoke('renderer:open-workspace', workspacePath);
        const { workspaceConfig, workspaceUid } = result;

        dispatch(createWorkspace({
          uid: workspaceUid,
          pathname: workspacePath,
          ...workspaceConfig
        }));

        await dispatch(switchWorkspace(workspaceUid));

        return result;
      }
    } catch (error) {
      throw error;
    }
  };
};

export const openWorkspaceDialog = () => {
  return async (dispatch) => {
    try {
      const result = await ipcRenderer.invoke('renderer:open-workspace-dialog');
      if (result) {
        const { workspaceConfig, workspaceUid } = result;

        dispatch(createWorkspace({
          uid: workspaceUid,
          pathname: result.workspacePath,
          ...workspaceConfig
        }));

        await dispatch(switchWorkspace(workspaceUid));

        return result;
      }
    } catch (error) {
      throw error;
    }
  };
};

export const connectCollectionToGit = ({ workspaceUid, collectionPath, remoteUrl }) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke(
        'renderer:connect-collection-to-git',
        workspace.pathname,
        collectionPath,
        remoteUrl
      );

      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to connect Git remote');
      throw error;
    }
  };
};

export const disconnectCollectionFromGit = ({ workspaceUid, collectionPath }) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke(
        'renderer:disconnect-collection-from-git',
        workspace.pathname,
        collectionPath
      );

      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to remove Git remote');
      throw error;
    }
  };
};

export const removeCollectionFromWorkspaceAction = (workspaceUid, collectionPath, options = {}) => {
  return async (dispatch, getState) => {
    try {
      const { deleteFiles = false } = options;
      const workspacesState = getState().workspaces;
      const collectionsState = getState().collections;
      const workspace = workspacesState.workspaces.find((w) => w.uid === workspaceUid);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const normalizedCollectionPath = normalizePath(collectionPath);

      const collection = collectionsState.collections.find(
        (c) => normalizePath(c.pathname) === normalizedCollectionPath
      );

      await ipcRenderer.invoke('renderer:remove-collection-from-workspace',
        workspaceUid,
        workspace.pathname,
        collectionPath,
        { deleteFiles });

      if (collection) {
        const workspaceCollection = workspace.collections?.find(
          (wc) => normalizePath(wc.path) === normalizedCollectionPath
        );

        if (workspaceCollection) {
          dispatch(removeCollection({ collectionUid: collection.uid }));
          dispatch(clearCollectionState({ collectionUid: collection.uid }));
        }
      }

      dispatch(removeCollectionFromWorkspace({
        workspaceUid,
        collectionLocation: collectionPath
      }));

      return true;
    } catch (error) {
      throw error;
    }
  };
};

const loadWorkspaceCollectionsForSwitch = async (dispatch, workspace) => {
  const openCollectionsFunction = (collectionPaths, workspacePath) => {
    return dispatch(openMultipleCollections(collectionPaths, { workspacePath }));
  };

  let updatedWorkspace = null;
  let requestedCollectionPaths = [];

  try {
    const shouldRefreshCollections = workspace.collections?.some((collection) => collection.notFoundLocally);
    await dispatch(loadWorkspaceCollections(workspace.uid, shouldRefreshCollections));
    const updatedWorkspace = await dispatch((_, getState) => getState().workspaces.workspaces.find((w) => w.uid === workspace.uid));

    if (updatedWorkspace?.collections?.length > 0) {
      const alreadyOpenCollections = await dispatch((_, getState) =>
        getState().collections.collections.map((c) => normalizePath(c.pathname))
      );

      const collectionPaths = updatedWorkspace.collections
        .filter((wc) => !wc.notFoundLocally)
        .map((wc) => wc.path)
        .filter((p) => p && !alreadyOpenCollections.includes(normalizePath(p)));

      const uniqueCollectionPaths = [...new Map(
        collectionPaths.map((collectionPath) => [normalizePath(collectionPath), collectionPath])
      ).values()];

      requestedCollectionPaths = uniqueCollectionPaths;

      if (uniqueCollectionPaths.length > 0) {
        await openCollectionsFunction(uniqueCollectionPaths, updatedWorkspace.pathname);
      }
    }

    // Load API specs for this workspace
    await dispatch(loadWorkspaceApiSpecs(workspace.uid));

    return {
      updatedWorkspace,
      requestedCollectionPaths
    };
  } catch (error) {
    console.error('Failed to load workspace collections:', error);

    return {
      updatedWorkspace,
      requestedCollectionPaths
    };
  }
};

const maybeCompleteSnapshotHydrationSession = (dispatch, getState) => {
  const state = getState();
  const snapshotHydration = state.app.snapshotHydration;

  if (!snapshotHydration?.workspaceUid) {
    return false;
  }

  if (state.workspaces.activeWorkspaceUid !== snapshotHydration.workspaceUid) {
    clearSnapshotHydrationTimeout();
    dispatch(clearSnapshotHydrationSession());
    return false;
  }

  if (snapshotHydration.pendingCollectionPathnames.length > 0) {
    return false;
  }

  clearSnapshotHydrationTimeout();
  dispatch(setSnapshotReady(true));
  dispatch(clearSnapshotHydrationSession());
  return true;
};

const scheduleSnapshotHydrationTimeout = (dispatch, getState, workspaceUid) => {
  clearSnapshotHydrationTimeout();

  snapshotHydrationTimer = setTimeout(() => {
    const state = getState();
    const session = state.app.snapshotHydration;

    if (!session?.workspaceUid || session.workspaceUid !== workspaceUid) {
      return;
    }

    const pendingCount = session.pendingCollectionPathnames.length;
    if (pendingCount > 0) {
      console.warn(
        `Snapshot hydration timeout for workspace ${workspaceUid}. `
        + `Proceeding with ${pendingCount} collection(s) still pending.`
      );
    }

    dispatch(setSnapshotReady(true));
    dispatch(clearSnapshotHydrationSession());
    clearSnapshotHydrationTimeout();
  }, SNAPSHOT_HYDRATION_TIMEOUT_MS);
};

export const hydrateSnapshotForOpenedCollection = (collectionPathname) => {
  return async (dispatch, getState) => {
    if (!collectionPathname) {
      return;
    }

    const state = getState();
    const snapshotHydration = state.app.snapshotHydration;

    if (!snapshotHydration?.workspaceUid) {
      return;
    }

    if (state.workspaces.activeWorkspaceUid !== snapshotHydration.workspaceUid) {
      clearSnapshotHydrationTimeout();
      dispatch(clearSnapshotHydrationSession());
      return;
    }

    const normalizedCollectionPath = normalizePath(collectionPathname);
    const isPendingHydration = snapshotHydration.pendingCollectionPathnames.some(
      (pathname) => normalizePath(pathname) === normalizedCollectionPath
    );

    if (!isPendingHydration) {
      return;
    }

    const collection = state.collections.collections.find(
      (c) => c.pathname && normalizePath(c.pathname) === normalizedCollectionPath
    );

    if (!collection) {
      return;
    }

    const activeWorkspace = state.workspaces.workspaces.find((w) => w.uid === snapshotHydration.workspaceUid);
    const activeWorkspacePathname = activeWorkspace?.pathname || null;

    await hydrateTabs([collection], dispatch, restoreTabs, null, activeWorkspacePathname);

    if (
      snapshotHydration.activeCollectionPathname
      && normalizePath(snapshotHydration.activeCollectionPathname) === normalizedCollectionPath
    ) {
      dispatch(expandCollection(collection.uid));

      const needsMount = collection.mountStatus !== 'mounted' && collection.mountStatus !== 'mounting';
      if (needsMount) {
        await dispatch(mountCollection({
          collectionUid: collection.uid,
          collectionPathname: collection.pathname,
          brunoConfig: collection.brunoConfig,
          skipTabRestore: true,
          workspacePathname: activeWorkspacePathname
        })).catch((err) => console.error('Failed to mount active collection:', err));
      }

      const activeTab = await getActiveTabFromSnapshot(
        collection.pathname,
        collection,
        null,
        activeWorkspacePathname
      );
      if (activeTab) {
        dispatch(addTab(activeTab));
      }
    }

    dispatch(markSnapshotCollectionHydrated({ pathname: collection.pathname }));
    maybeCompleteSnapshotHydrationSession(dispatch, getState);
  };
};

export const loadWorkspaceApiSpecs = (workspaceUid) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace || !workspace.pathname) {
        return;
      }

      const apiSpecs = await ipcRenderer.invoke('renderer:load-workspace-apispecs', workspace.pathname);

      dispatch(updateWorkspace({
        uid: workspaceUid,
        apiSpecs: apiSpecs
      }));

      const allApiSpecs = getState().apiSpec.apiSpecs;
      const alreadyOpenApiSpecs = allApiSpecs.map((a) => a.pathname);

      for (const apiSpec of apiSpecs) {
        if (apiSpec.path && !alreadyOpenApiSpecs.includes(apiSpec.path)) {
          try {
            await ipcRenderer.invoke('renderer:open-api-spec-file', apiSpec.path, workspace.pathname);
          } catch (error) {
            console.error('Error opening API spec:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading workspace API specs:', error);
    }
  };
};

export const switchWorkspace = (workspaceUid) => {
  return async (dispatch, getState) => {
    clearSnapshotHydrationTimeout();
    dispatch(setSnapshotReady(false));
    dispatch(clearSnapshotHydrationSession());

    try {
      dispatch(setActiveWorkspace(workspaceUid));

      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        return;
      }

      const fullSnapshot = await ipcRenderer.invoke('renderer:snapshot:get').catch(() => null);
      const snapshotLookups = hydrateSnapshotLookups(fullSnapshot || {});
      const workspaceSnapshot = workspace.pathname
        ? snapshotLookups.workspacesByPath[normalizePath(workspace.pathname)] || null
        : null;
      const snapshotCollectionSortOrder = normalizeCollectionSortOrder(workspaceSnapshot?.sorting);
      dispatch(sortCollections({ order: snapshotCollectionSortOrder }));

      // Load global environments
      const envResult = await ipcRenderer.invoke('renderer:get-global-environments', {
        workspaceUid,
        workspacePath: workspace.pathname
      }).catch(() => null);

      dispatch(updateGlobalEnvironments({
        globalEnvironments: envResult?.globalEnvironments || [],
        activeGlobalEnvironmentUid: envResult?.activeGlobalEnvironmentUid || null
      }));

      // Mount scratch collection and load workspace collections
      const scratchCollection = await dispatch(mountScratchCollection(workspaceUid));
      const { updatedWorkspace } = await loadWorkspaceCollectionsForSwitch(dispatch, workspace);

      const latestWorkspace = updatedWorkspace || getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      const workspaceCollectionPaths = [...new Map(
        (latestWorkspace?.collections || [])
          .map((workspaceCollection) => workspaceCollection.path)
          .filter(Boolean)
          .map((collectionPath) => [normalizePath(collectionPath), collectionPath])
      ).values()];
      const workspaceCollectionPathSet = new Set(
        workspaceCollectionPaths.map((collectionPath) => normalizePath(collectionPath))
      );

      // Hydrate tabs for workspace collections currently present in Redux
      const collections = getState().collections.collections.filter(
        (c) => c.pathname
          && c.uid !== scratchCollection?.uid
          && workspaceCollectionPathSet.has(normalizePath(c.pathname))
      );
      await hydrateTabs(collections, dispatch, restoreTabs, snapshotLookups, workspace.pathname || null);

      // Add workspace tabs
      if (scratchCollection?.uid) {
        dispatch(addTab({ uid: `${scratchCollection.uid}-overview`, collectionUid: scratchCollection.uid, type: 'workspaceOverview' }));
        dispatch(addTab({ uid: `${scratchCollection.uid}-environments`, collectionUid: scratchCollection.uid, type: 'workspaceEnvironments' }));
      }

      // Restore active collection from snapshot using lastActiveCollectionPathname
      const lastActiveCollectionPathname = workspaceSnapshot?.lastActiveCollectionPathname || null;
      const activeCollection = lastActiveCollectionPathname
        ? getState().collections.collections.find((c) => normalizePath(c.pathname) === normalizePath(lastActiveCollectionPathname))
        : null;

      if (activeCollection) {
        dispatch(expandCollection(activeCollection.uid));

        const needsMount = activeCollection.mountStatus !== 'mounted' && activeCollection.mountStatus !== 'mounting';
        if (needsMount) {
          await dispatch(mountCollection({
            collectionUid: activeCollection.uid,
            collectionPathname: activeCollection.pathname,
            brunoConfig: activeCollection.brunoConfig,
            skipTabRestore: true,
            workspacePathname: workspace.pathname || null
          })).catch((err) => console.error('Failed to mount active collection:', err));
        }

        // Focus the active tab from the collection's tab snapshot
        const activeTab = await getActiveTabFromSnapshot(
          activeCollection.pathname,
          activeCollection,
          snapshotLookups,
          workspace.pathname || null
        );

        if (activeTab) {
          dispatch(addTab(activeTab));
        } else if (scratchCollection?.uid) {
          dispatch(addTab({ uid: `${scratchCollection.uid}-overview`, collectionUid: scratchCollection.uid, type: 'workspaceOverview' }));
        }
      } else if (scratchCollection?.uid) {
        // No active collection, focus the workspace overview tab
        dispatch(addTab({ uid: `${scratchCollection.uid}-overview`, collectionUid: scratchCollection.uid, type: 'workspaceOverview' }));
      }

      const openWorkspaceCollectionPaths = new Set(
        getState().collections.collections
          .filter((c) => c.pathname && workspaceCollectionPathSet.has(normalizePath(c.pathname)))
          .map((c) => normalizePath(c.pathname))
      );

      const pendingCollectionPathnames = workspaceCollectionPaths
        .filter((collectionPath) => !openWorkspaceCollectionPaths.has(normalizePath(collectionPath)));

      dispatch(startSnapshotHydrationSession({
        workspaceUid,
        pendingCollectionPathnames,
        activeCollectionPathname: lastActiveCollectionPathname || null
      }));

      const completed = maybeCompleteSnapshotHydrationSession(dispatch, getState);
      if (!completed && pendingCollectionPathnames.length > 0) {
        scheduleSnapshotHydrationTimeout(dispatch, getState, workspaceUid);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    } finally {
      const state = getState();
      const hasHydrationSession = Boolean(state.app.snapshotHydration?.workspaceUid);
      if (!state.app.snapshotReady && !hasHydrationSession) {
        dispatch(setSnapshotReady(true));
      }
    }
  };
};

export const loadWorkspaceCollections = (workspaceUid, force = false) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const hasProcessedCollections = workspace.collections
        && workspace.collections.length > 0
        && workspace.collections.some((c) => c.path && path.isAbsolute(c.path));

      if (!force && hasProcessedCollections) {
        return workspace.collections;
      }

      dispatch(updateWorkspaceLoadingState({ workspaceUid, loadingState: 'loading' }));

      let collections = [];

      if (!workspace.pathname) {
        collections = [];
      } else {
        const rawCollections = await ipcRenderer.invoke('renderer:load-workspace-collections', workspace.pathname);

        collections = rawCollections.map((collection) => {
          return {
            ...collection
          };
        });
      }

      dispatch(updateWorkspace({
        uid: workspaceUid,
        collections
      }));

      dispatch(updateWorkspaceLoadingState({ workspaceUid, loadingState: 'loaded' }));

      return collections;
    } catch (error) {
      dispatch(updateWorkspaceLoadingState({ workspaceUid, loadingState: 'error' }));
      throw error;
    }
  };
};

export const removeWorkspaceAction = (workspaceUid) => {
  return (dispatch) => {
    dispatch(removeWorkspace(workspaceUid));
  };
};

export const loadLastOpenedWorkspaces = () => {
  return async (dispatch, getState) => {
    try {
      const workspaces = await ipcRenderer.invoke('renderer:get-last-opened-workspaces');
      const currentWorkspaces = getState().workspaces.workspaces;
      const validWorkspaceUids = new Set(workspaces.map((w) => w.uid));

      for (const currentWorkspace of currentWorkspaces) {
        if (currentWorkspace.type !== 'default' && !validWorkspaceUids.has(currentWorkspace.uid)) {
          dispatch(removeWorkspace(currentWorkspace.uid));
        }
      }

      for (const workspace of workspaces) {
        const existingWorkspace = currentWorkspaces.find((w) => w.uid === workspace.uid);

        if (!existingWorkspace) {
          dispatch(createWorkspace(workspace));

          if (workspace.pathname) {
            try {
              await ipcRenderer.invoke('renderer:start-workspace-watcher', workspace.pathname);
            } catch (error) {
            }
          }
        }
      }

      return workspaces;
    } catch (error) {
      throw error;
    }
  };
};

export const workspaceOpenedEvent = (workspacePath, workspaceUid, workspaceConfig) => {
  return async (dispatch, getState) => {
    dispatch(createWorkspace({
      uid: workspaceUid,
      pathname: workspacePath,
      ...workspaceConfig
    }));

    try {
      await dispatch(loadWorkspaceCollections(workspaceUid));
    } catch (error) {
    }

    const state = getState();
    const activeWorkspaceUid = state.workspaces.activeWorkspaceUid;

    let shouldSwitch = false;
    try {
      const snapshot = await ipcRenderer.invoke('renderer:snapshot:get');
      const activeWorkspacePath = snapshot?.activeWorkspacePath;

      const currentState = getState();
      if (!currentState.app.snapshotReady && snapshot?.extras?.devTools) {
        const { open } = snapshot.extras.devTools;
        if (open) {
          dispatch(openConsole());
        } else {
          dispatch(closeConsole());
        }
        const { activeTab = 'terminal' } = snapshot.extras.devTools;
        dispatch(setActiveDevToolsTab(activeTab));
      }

      if (activeWorkspacePath) {
        shouldSwitch = workspacePath === activeWorkspacePath;
      } else {
        shouldSwitch = !activeWorkspaceUid || workspaceConfig.type === 'default';
      }
    } catch (err) {
      shouldSwitch = !activeWorkspaceUid || workspaceConfig.type === 'default';
    }
    if (shouldSwitch) {
      dispatch(switchWorkspace(workspaceUid));
    }
  };
};

export const workspaceConfigUpdatedEvent = (workspacePath, workspaceUid, workspaceConfig) => {
  return async (dispatch, getState) => {
    if (!workspaceConfig) {
      return;
    }

    const { collections, apiSpecs, ...configWithoutCollections } = workspaceConfig;

    dispatch(updateWorkspace({
      uid: workspaceUid,
      ...configWithoutCollections
    }));

    const activeWorkspaceUid = getState().workspaces.activeWorkspaceUid;
    if (activeWorkspaceUid === workspaceUid) {
      try {
        await dispatch(loadWorkspaceCollections(workspaceUid, true));

        const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
        const openCollections = getState().collections.collections.map((c) => normalizePath(c.pathname));

        if (workspace?.collections?.length > 0) {
          const newCollectionPaths = workspace.collections
            .filter((workspaceCollection) => !workspaceCollection.notFoundLocally)
            .map((workspaceCollection) => workspaceCollection.path)
            .filter((collectionPath) => collectionPath && !openCollections.includes(normalizePath(collectionPath)));

          // Deduplicate paths to prevent "collection already opened" toast
          const uniqueNewCollectionPaths = [...new Map(
            newCollectionPaths.map((p) => [normalizePath(p), p])
          ).values()];

          if (uniqueNewCollectionPaths.length > 0) {
            try {
              await dispatch(openMultipleCollections(uniqueNewCollectionPaths, { workspacePath: workspace.pathname }));
            } catch (error) {
            }
          }
        }

        // Load API specs when workspace config is updated
        await dispatch(loadWorkspaceApiSpecs(workspaceUid));
      } catch (error) {
      }
    }
  };
};

export const saveWorkspaceDocs = (workspaceUid, docs) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (!workspace.pathname) {
        throw new Error('Workspace path not found');
      }

      await ipcRenderer.invoke('renderer:save-workspace-docs', workspace.pathname, docs || '');

      dispatch(updateWorkspace({
        uid: workspaceUid,
        docs: docs
      }));

      return docs;
    } catch (error) {
      throw error;
    }
  };
};

export const createCollectionInWorkspace = (collectionName, collectionFolderName, collectionLocation, workspaceUid) => {
  return async (dispatch, getState) => {
    const currentWorkspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
    if (!currentWorkspace) {
      throw new Error('Workspace not found');
    }

    const projectCollectionLocation = path.join(currentWorkspace.pathname, 'collections');

    return await dispatch(createCollection(collectionName, collectionFolderName, projectCollectionLocation, {
      workspaceId: currentWorkspace.pathname
    }));
  };
};

export const openCollectionInWorkspace = () => {
  return (dispatch) => dispatch(openCollection());
};

const handleWorkspaceAction = async (action, workspaceUid, ...args) => {
  try {
    await action(workspaceUid, ...args);
    return true;
  } catch (error) {
    const actionName = action.name.replace('renderer:', '').replace('-', ' ');
    toast.error(error.message || `Failed to ${actionName} workspace`);
    throw error;
  }
};

export const renameWorkspaceAction = (workspaceUid, newName) => {
  return async (dispatch, getState) => {
    try {
      const { workspaces } = getState().workspaces;
      const workspace = workspaces.find((w) => w.uid === workspaceUid);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await handleWorkspaceAction((...args) => ipcRenderer.invoke('renderer:rename-workspace', ...args),
        workspace.pathname,
        newName);

      dispatch(updateWorkspace({
        uid: workspaceUid,
        name: newName
      }));
    } catch (error) {
      throw error;
    }
  };
};

export const closeWorkspaceAction = (workspaceUid) => {
  return async (dispatch, getState) => {
    try {
      const { workspaces } = getState().workspaces;
      const workspace = workspaces.find((w) => w.uid === workspaceUid);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke('renderer:close-workspace', workspace.pathname);
      dispatch(removeWorkspace(workspaceUid));
    } catch (error) {
      toast.error(error.message || 'Failed to close workspace');
      throw error;
    }
  };
};

export const importCollectionInWorkspace = (collection, workspaceUid, collectionLocation, type) => {
  return async (dispatch, getState) => {
    const currentWorkspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!currentWorkspace) {
      throw new Error('Workspace not found');
    }

    const location = collectionLocation || path.join(currentWorkspace.pathname, 'collections');
    const transformedCollection = await transformCollection(collection, type);
    const collectionPath = await ipcRenderer.invoke('renderer:import-collection', transformedCollection, location);

    const workspaceCollection = {
      name: transformedCollection.name,
      path: collectionPath
    };

    await ipcRenderer.invoke('renderer:add-collection-to-workspace', currentWorkspace.pathname, workspaceCollection);

    return collectionPath;
  };
};

export const loadWorkspaceEnvironments = (workspaceUid) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const environments = await ipcRenderer.invoke('renderer:load-workspace-environments', workspace.pathname);

      dispatch(updateWorkspace({
        uid: workspaceUid,
        environments: environments
      }));

      return environments;
    } catch (error) {
      throw error;
    }
  };
};

export const createWorkspaceEnvironment = (workspaceUid, environmentName) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const environment = await ipcRenderer.invoke('renderer:create-workspace-environment', workspace.pathname, environmentName);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return environment;
    } catch (error) {
      throw error;
    }
  };
};

export const deleteWorkspaceEnvironment = (workspaceUid, environmentUid) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke('renderer:delete-workspace-environment', workspace.pathname, environmentUid);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return true;
    } catch (error) {
      throw error;
    }
  };
};

export const importWorkspaceEnvironment = (workspaceUid, environmentData) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const environment = await ipcRenderer.invoke('renderer:import-workspace-environment', workspace.pathname, environmentData);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return environment;
    } catch (error) {
      throw error;
    }
  };
};

export const updateWorkspaceEnvironment = (workspaceUid, environmentUid, environmentData) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke('renderer:update-workspace-environment', workspace.pathname, environmentUid, environmentData);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return true;
    } catch (error) {
      throw error;
    }
  };
};

export const renameWorkspaceEnvironment = (workspaceUid, environmentUid, newName) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke('renderer:rename-workspace-environment', workspace.pathname, environmentUid, newName);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return true;
    } catch (error) {
      throw error;
    }
  };
};

export const copyWorkspaceEnvironment = (workspaceUid, environmentUid, newName) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const newEnvironment = await ipcRenderer.invoke('renderer:copy-workspace-environment', workspace.pathname, environmentUid, newName);

      await dispatch(loadWorkspaceEnvironments(workspaceUid));

      return newEnvironment;
    } catch (error) {
      throw error;
    }
  };
};

export const exportWorkspaceAction = (workspaceUid) => {
  return async (dispatch, getState) => {
    try {
      const { workspaces } = getState().workspaces;
      const workspace = workspaces.find((w) => w.uid === workspaceUid);

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      if (!workspace.pathname) {
        throw new Error('Workspace path not found');
      }

      const result = await ipcRenderer.invoke('renderer:export-workspace', workspace.pathname, workspace.name);

      if (result.canceled) {
        return { canceled: true };
      }

      return result;
    } catch (error) {
      throw error;
    }
  };
};

export const importWorkspaceAction = (zipFilePath, extractLocation) => {
  return async (dispatch) => {
    try {
      const result = await ipcRenderer.invoke('renderer:import-workspace', zipFilePath, extractLocation);

      if (result.success) {
        dispatch(createWorkspace({
          uid: result.workspaceUid,
          pathname: result.workspacePath,
          ...result.workspaceConfig
        }));

        await dispatch(switchWorkspace(result.workspaceUid));
      }

      return result;
    } catch (error) {
      throw error;
    }
  };
};

export const saveWorkspaceDotEnvVariables = (workspaceUid, variables, filename = '.env') => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return reject(new Error('Workspace not found'));
    }

    if (!workspace.pathname) {
      return reject(new Error('Workspace path not found'));
    }

    ipcRenderer
      .invoke('renderer:save-workspace-dotenv-variables', { workspacePath: workspace.pathname, variables, filename })
      .then(resolve)
      .catch(reject);
  });
};

export const saveWorkspaceDotEnvRaw = (workspaceUid, content, filename = '.env') => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return reject(new Error('Workspace not found'));
    }

    if (!workspace.pathname) {
      return reject(new Error('Workspace path not found'));
    }

    ipcRenderer
      .invoke('renderer:save-workspace-dotenv-raw', { workspacePath: workspace.pathname, content, filename })
      .then(resolve)
      .catch(reject);
  });
};

export const createWorkspaceDotEnvFile = (workspaceUid, filename = '.env') => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return reject(new Error('Workspace not found'));
    }

    if (!workspace.pathname) {
      return reject(new Error('Workspace path not found'));
    }

    ipcRenderer
      .invoke('renderer:create-workspace-dotenv-file', { workspacePath: workspace.pathname, filename })
      .then(resolve)
      .catch(reject);
  });
};

export const deleteWorkspaceDotEnvFile = (workspaceUid, filename = '.env') => (dispatch, getState) => {
  return new Promise((resolve, reject) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return reject(new Error('Workspace not found'));
    }

    if (!workspace.pathname) {
      return reject(new Error('Workspace path not found'));
    }

    ipcRenderer
      .invoke('renderer:delete-workspace-dotenv-file', { workspacePath: workspace.pathname, filename })
      .then(resolve)
      .catch(reject);
  });
};

// Scratch Collection Actions

/**
 * Get the scratch collection for a workspace
 */
export const getScratchCollection = (workspaceUid) => {
  return (dispatch, getState) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);
    if (!workspace?.scratchCollectionUid) {
      return null;
    }
    return state.collections.collections.find((c) => c.uid === workspace.scratchCollectionUid);
  };
};

/**
 * Mount scratch collection for a workspace
 */
export const mountScratchCollection = (workspaceUid) => {
  return async (dispatch, getState) => {
    const state = getState();
    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return null;
    }

    if (workspace.scratchCollectionUid) {
      const existingCollection = state.collections.collections.find(
        (c) => c.uid === workspace.scratchCollectionUid
      );
      if (existingCollection) {
        return existingCollection;
      }
    }

    try {
      const tempDirectoryPath = await ipcRenderer.invoke('renderer:mount-workspace-scratch', {
        workspaceUid,
        workspacePath: workspace.pathname || 'default'
      });

      const { generateUidBasedOnHash } = await import('utils/common');
      const scratchCollectionUid = generateUidBasedOnHash(tempDirectoryPath);

      const brunoConfig = {
        opencollection: '1.0.0',
        name: 'Scratch',
        type: 'collection',
        ignore: ['node_modules', '.git']
      };

      await ipcRenderer.invoke('renderer:add-collection-watcher', {
        collectionPath: tempDirectoryPath,
        collectionUid: scratchCollectionUid,
        brunoConfig
      });

      // Map scratch collection to workspace so getProcessEnvVars can resolve workspace .env values
      if (workspace.pathname) {
        await ipcRenderer.invoke('renderer:set-collection-workspace', scratchCollectionUid, workspace.pathname);
      }

      await dispatch(openScratchCollectionEvent(scratchCollectionUid, tempDirectoryPath, brunoConfig));

      dispatch(setWorkspaceScratchCollection({
        workspaceUid,
        scratchCollectionUid,
        scratchTempDirectory: tempDirectoryPath
      }));

      dispatch(addTransientDirectory({
        collectionUid: scratchCollectionUid,
        pathname: tempDirectoryPath
      }));

      dispatch(updateCollectionMountStatus({ collectionUid: scratchCollectionUid, mountStatus: 'mounted' }));

      return { uid: scratchCollectionUid, pathname: tempDirectoryPath };
    } catch (error) {
      console.error('Error mounting scratch collection:', error);
      if (workspace.scratchCollectionUid) {
        dispatch(updateCollectionMountStatus({ collectionUid: workspace.scratchCollectionUid, mountStatus: 'unmounted' }));
      }
      return null;
    }
  };
};
