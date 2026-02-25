import path from 'path';
import pLimit from 'p-limit';
import {
  createWorkspace,
  removeWorkspace,
  setActiveWorkspace,
  updateWorkspace,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  updateWorkspaceLoadingState,
  setWorkspaceScratchCollection
} from '../workspaces';
import { showHomePage, setRestoringSnapshot, setSnapshotRestoreMessage, enableSnapshotSave, markInitialLoadComplete, setPendingWorkspaceRestore, clearPendingWorkspaceRestore } from '../app';
import { createCollection, openCollection, openMultipleCollections, openScratchCollectionEvent, selectEnvironment, mountCollection } from '../collections/actions';
import { removeCollection, addTransientDirectory, updateCollectionMountStatus, setCollectionCollapsed } from '../collections';
import { updateGlobalEnvironments } from '../global-environments';
import { addTab, focusTab, restoreTabs } from '../tabs';
import { openConsole, closeConsole, setActiveTab, setDevtoolsHeight } from '../logs';
import { normalizePath } from 'utils/common/path';
import toast from 'react-hot-toast';
import { buildRestoreSequence, restoreTabsForCollection } from 'utils/app-snapshot/restore';
import { findCollectionByPathname, findEnvironmentInCollectionByName } from 'utils/collections';
import { waitForMountComplete } from 'utils/collection-mount';
import { isWorkspaceHydrated, markWorkspaceHydrated } from 'utils/workspace-hydration';

const { ipcRenderer } = window;

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

  try {
    await dispatch(loadWorkspaceCollections(workspace.uid));
    const updatedWorkspace = await dispatch((_, getState) => getState().workspaces.workspaces.find((w) => w.uid === workspace.uid));

    if (updatedWorkspace?.collections?.length > 0) {
      const alreadyOpenCollections = await dispatch((_, getState) =>
        getState().collections.collections.map((c) => normalizePath(c.pathname))
      );

      const collectionPaths = updatedWorkspace.collections
        .map((wc) => wc.path)
        .filter((p) => p && !alreadyOpenCollections.includes(normalizePath(p)));

      const uniqueCollectionPaths = [...new Map(
        collectionPaths.map((p) => [normalizePath(p), p])
      ).values()];

      if (uniqueCollectionPaths.length > 0) {
        await openCollectionsFunction(uniqueCollectionPaths, updatedWorkspace.pathname);
      }
    }

    // Load API specs for this workspace
    await dispatch(loadWorkspaceApiSpecs(workspace.uid));
  } catch (error) {
    console.error('Failed to load workspace collections:', error);
  }
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
    dispatch(setActiveWorkspace(workspaceUid));

    const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);

    if (!workspace) {
      return;
    }

    try {
      const { ipcRenderer } = window;

      const result = await ipcRenderer.invoke('renderer:get-global-environments',
        {
          workspaceUid,
          workspacePath: workspace.pathname
        });

      const globalEnvironments = result?.globalEnvironments || [];
      const activeGlobalEnvironmentUid = result?.activeGlobalEnvironmentUid || null;

      dispatch(updateGlobalEnvironments({ globalEnvironments, activeGlobalEnvironmentUid }));
    } catch (error) {
      dispatch(updateGlobalEnvironments({ globalEnvironments: [], activeGlobalEnvironmentUid: null }));
    }

    const scratchCollection = await dispatch(mountScratchCollection(workspaceUid));
    await loadWorkspaceCollectionsForSwitch(dispatch, workspace);

    const pendingRestore = getState().app.pendingWorkspaceRestores[workspace.pathname];
    const isRestoring = getState().app.isRestoringSnapshot;

    if (pendingRestore) {
      if (isRestoring) {
        dispatch(setSnapshotRestoreMessage('Loading collections...'));
      }
      await restoreWorkspaceState(dispatch, getState, pendingRestore.collections);
      dispatch(clearPendingWorkspaceRestore({ workspacePathname: workspace.pathname }));
    } else if (!isWorkspaceHydrated(workspaceUid) && scratchCollection?.uid) {
      const overviewTabUid = `${scratchCollection.uid}-overview`;
      const environmentsTabUid = `${scratchCollection.uid}-environments`;

      dispatch(addTab({
        uid: overviewTabUid,
        collectionUid: scratchCollection.uid,
        type: 'workspaceOverview'
      }));

      dispatch(addTab({
        uid: environmentsTabUid,
        collectionUid: scratchCollection.uid,
        type: 'workspaceEnvironments'
      }));

      dispatch(focusTab({
        uid: overviewTabUid
      }));
    }

    markWorkspaceHydrated(workspaceUid);
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

    if (!activeWorkspaceUid || workspaceConfig.type === 'default') {
      await dispatch(switchWorkspace(workspaceUid));
      dispatch(markInitialLoadComplete());
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

    const projectCollectionLocation = `${currentWorkspace.pathname}/collections`;

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

export const selectWorkspaceEnvironment = (workspaceUid, environmentUid) => {
  return async (dispatch, getState) => {
    try {
      const workspace = getState().workspaces.workspaces.find((w) => w.uid === workspaceUid);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      await ipcRenderer.invoke('renderer:select-workspace-environment', workspace.pathname, environmentUid);

      dispatch(updateWorkspace({
        uid: workspaceUid,
        activeEnvironmentUid: environmentUid
      }));

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

/**
 * Restores workspace state from snapshot data.
 * Used by both initial app restore and workspace switching.
 * Uses controlled concurrency for mounting collections.
 *
 * @param {Function} dispatch - Redux dispatch
 * @param {Function} getState - Redux getState
 * @param {Array} collectionsToRestore - Collection schemas from snapshot
 */
const restoreWorkspaceState = async (dispatch, getState, collectionsToRestore) => {
  if (!collectionsToRestore || collectionsToRestore.length === 0) {
    return;
  }

  const limit = pLimit(4);

  await Promise.all(collectionsToRestore.map((collectionSchema) =>
    limit(async () => {
      const { pathname, isMounted: wasMounted, isOpen, environment, tabs, activeTabIndex } = collectionSchema;

      try {
        // 1. Open collection if not in Redux (makes it visible in sidebar)
        let collection = findCollectionByPathname(getState().collections.collections, pathname);
        if (!collection) {
          await dispatch(openMultipleCollections([pathname]));
          await new Promise((resolve) => setTimeout(resolve, 100));
          collection = findCollectionByPathname(getState().collections.collections, pathname);
        }

        if (!collection) {
          console.warn(`[restore] Could not open collection: ${pathname}`);
          return;
        }

        // 2. Restore collapsed state (isOpen = !collapsed)
        if (typeof isOpen === 'boolean') {
          dispatch(setCollectionCollapsed({ collectionUid: collection.uid, collapsed: !isOpen }));
        }

        // 3. Only mount if it was mounted before (wasMounted from snapshot)
        if (!wasMounted) {
          return;
        }

        // 3. Mount and wait for completion if not already mounted
        if (collection.mountStatus !== 'mounted') {
          // IMPORTANT: Set up listener FIRST to avoid race condition
          // We wait for the IPC event, not mountStatus, because mountStatus is set
          // before files are actually loaded
          const mountCompletePromise = waitForMountComplete(collection.uid);
          const mountPromise = dispatch(mountCollection({
            collectionUid: collection.uid,
            collectionPathname: collection.pathname,
            brunoConfig: collection.brunoConfig
          }));

          await Promise.all([
            mountPromise,
            mountCompletePromise
          ]);

          collection = findCollectionByPathname(getState().collections.collections, pathname);
        }

        if (!collection || collection.mountStatus !== 'mounted') {
          console.warn(`[restore] Collection not mounted: ${pathname}`);
          return;
        }

        // 4. Restore environment selection (only for mounted collections)
        if (environment) {
          const env = findEnvironmentInCollectionByName(collection, environment);
          if (env) {
            dispatch(selectEnvironment(env.uid, collection.uid));
          }
        }

        // 5. Restore tabs (only for mounted collections - need items loaded)
        if (tabs && tabs.length > 0) {
          const existingTabs = getState().tabs.tabs.filter((t) => t.collectionUid === collection.uid);
          if (existingTabs.length === 0) {
            const restoredTabs = restoreTabsForCollection(collection, tabs);
            if (restoredTabs.length > 0) {
              const activeTabIdx = activeTabIndex < restoredTabs.length ? activeTabIndex : 0;
              const activeTabUid = restoredTabs[activeTabIdx]?.uid || null;
              dispatch(restoreTabs({ tabs: restoredTabs, activeTabUid }));
            }
          }
        }
      } catch (error) {
        console.warn(`[restore] Failed to restore collection ${pathname}:`, error);
      }
    })
  ));
};

/**
 * Restore app snapshot from persisted state
 * Waits for app to be fully initialized before restoring
 * Uses lazy loading: only mounts collections for active workspace immediately
 */
export const restoreAppSnapshot = () => {
  return async (dispatch, getState) => {
    try {
      dispatch(setRestoringSnapshot(true));
      dispatch(setSnapshotRestoreMessage('Initializing...'));

      const waitForInitialLoad = () => {
        return new Promise((resolve) => {
          const checkReady = () => {
            const state = getState();
            if (state.app.isInitialLoadComplete) {
              resolve();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });
      };

      await waitForInitialLoad();

      const snapshot = await ipcRenderer.invoke('renderer:get-app-snapshot');

      if (!snapshot) {
        dispatch(setRestoringSnapshot(false));
        dispatch(enableSnapshotSave());
        return;
      }

      const restoreActions = buildRestoreSequence(snapshot, getState());

      if (!restoreActions) {
        console.warn('[app-snapshot] Failed to build restore sequence');
        dispatch(setRestoringSnapshot(false));
        dispatch(enableSnapshotSave());
        return;
      }

      if (restoreActions.devTools) {
        const { isConsoleOpen, activeTab, devtoolsHeight } = restoreActions.devTools;
        if (isConsoleOpen) {
          dispatch(openConsole());
        } else {
          dispatch(closeConsole());
        }
        if (activeTab) {
          dispatch(setActiveTab(activeTab));
        }
        if (devtoolsHeight) {
          dispatch(setDevtoolsHeight(devtoolsHeight));
        }
      }

      const targetWorkspacePathname = snapshot.activeWorkspacePathname;
      const workspaces = getState().workspaces.workspaces;
      const snapshotWorkspaces = snapshot.workspaces || [];
      const snapshotCollections = snapshot.collections || [];

      for (const snapshotWorkspace of snapshotWorkspaces) {
        const workspaceCollections = snapshotCollections.filter((c) => {
          const wsCollections = snapshotWorkspace.collections || [];
          return wsCollections.some((wc) => wc.pathname === c.pathname);
        });

        if (workspaceCollections.length > 0) {
          dispatch(setPendingWorkspaceRestore({
            workspacePathname: snapshotWorkspace.pathname,
            restoreData: {
              collections: workspaceCollections
            }
          }));
        }
      }

      if (targetWorkspacePathname) {
        const targetWorkspace = workspaces.find((w) => w.pathname === targetWorkspacePathname);

        if (targetWorkspace) {
          const currentActiveWorkspaceUid = getState().workspaces.activeWorkspaceUid;

          if (currentActiveWorkspaceUid !== targetWorkspace.uid) {
            dispatch(setSnapshotRestoreMessage('Switching workspace...'));
            await dispatch(switchWorkspace(targetWorkspace.uid));
          } else {
            const pendingRestore = getState().app.pendingWorkspaceRestores[targetWorkspacePathname];
            if (pendingRestore) {
              dispatch(setSnapshotRestoreMessage('Loading collections...'));
              await restoreWorkspaceState(dispatch, getState, pendingRestore.collections);
              dispatch(clearPendingWorkspaceRestore({ workspacePathname: targetWorkspacePathname }));
            }
            markWorkspaceHydrated(targetWorkspace.uid);
          }
        }
      }

      dispatch(setRestoringSnapshot(false));
      dispatch(enableSnapshotSave());
    } catch (error) {
      console.error('[app-snapshot] Error restoring snapshot:', error);
      dispatch(setRestoringSnapshot(false));
      dispatch(enableSnapshotSave());
    }
  };
};
