import path from 'path';
import {
  createWorkspace,
  removeWorkspace,
  setActiveWorkspace,
  updateWorkspace,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  updateWorkspaceLoadingState,
  addScratchTempDirectory,
  initScratchCollection,
  addScratchRequest,
  updateScratchRequest,
  removeScratchRequest
} from '../workspaces';
import { showHomePage } from '../app';
import { createCollection, openCollection, openMultipleCollections } from '../collections/actions';
import { removeCollection, createCollection as createCollectionReducer, collectionAddFileEvent } from '../collections';
import { updateGlobalEnvironments } from '../global-environments';
import { initializeWorkspaceTabs, setActiveWorkspaceTab, addWorkspaceTab, closeWorkspaceTab } from '../workspaceTabs';
import { normalizePath } from 'utils/common/path';
import toast from 'react-hot-toast';

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

    // Mount scratch directory if not already mounted for this workspace
    await dispatch(mountScratchDirectory(workspaceUid));

    await loadWorkspaceCollectionsForSwitch(dispatch, workspace);
    dispatch(showHomePage());

    const permanentTabs = [
      { type: 'overview', label: 'Overview' },
      { type: 'environments', label: 'Global Environments' }
    ];
    dispatch(initializeWorkspaceTabs({ workspaceUid, permanentTabs }));
    dispatch(setActiveWorkspaceTab({ workspaceUid, type: 'overview' }));
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

    // If this is the default workspace or no workspace is active yet, switch to it
    const state = getState();
    const activeWorkspaceUid = state.workspaces.activeWorkspaceUid;

    if (!activeWorkspaceUid || workspaceConfig.type === 'default') {
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

// Scratch Request Actions

export const mountScratchDirectory = (workspaceUid) => {
  return async (dispatch, getState) => {
    const state = getState();

    // Check if scratch directory already exists for this workspace
    if (state.workspaces.scratchTempDirectories[workspaceUid]) {
      return state.workspaces.scratchTempDirectories[workspaceUid];
    }

    const workspace = state.workspaces.workspaces.find((w) => w.uid === workspaceUid);
    if (!workspace) {
      return null;
    }

    try {
      const tempDirectoryPath = await ipcRenderer.invoke('renderer:mount-workspace-scratch', {
        workspaceUid,
        workspacePath: workspace.pathname || 'default'
      });

      dispatch(addScratchTempDirectory({ workspaceUid, tempDirectoryPath }));
      dispatch(initScratchCollection({ workspaceUid, tempDirectoryPath }));

      // Also create the collection in the main collections state so existing components work
      const scratchCollectionUid = `scratch-${workspaceUid}`;
      dispatch(createCollectionReducer({
        uid: scratchCollectionUid,
        name: 'Scratch Requests',
        pathname: tempDirectoryPath,
        items: [],
        environments: [],
        activeEnvironmentUid: null,
        brunoConfig: {
          version: '1',
          type: 'scratch',
          name: 'Scratch Requests'
        }
      }));

      return tempDirectoryPath;
    } catch (error) {
      console.error('Error mounting scratch directory:', error);
      return null;
    }
  };
};

export const scratchRequestAddedEvent = (workspaceUid, file) => {
  return (dispatch, getState) => {
    const item = {
      uid: file.data?.uid,
      name: file.data?.name,
      type: file.data?.type || 'http-request',
      pathname: file.meta?.pathname,
      filename: file.meta?.name,
      request: file.data?.request || {},
      response: null,
      draft: null,
      ...file.data
    };

    dispatch(addScratchRequest({ workspaceUid, item }));

    // Also add to the main collections state
    const scratchCollectionUid = `scratch-${workspaceUid}`;
    dispatch(collectionAddFileEvent({
      file: {
        data: item,
        meta: {
          collectionUid: scratchCollectionUid,
          pathname: file.meta?.pathname,
          name: file.meta?.name
        }
      }
    }));

    // Open a tab for the new scratch request
    const state = getState();
    const activeWorkspaceUid = state.workspaces.activeWorkspaceUid;
    if (activeWorkspaceUid === workspaceUid) {
      dispatch(addWorkspaceTab({
        uid: item.uid,
        workspaceUid,
        type: 'scratch-request',
        label: item.name,
        itemUid: item.uid
      }));
    }
  };
};

export const scratchRequestChangedEvent = (workspaceUid, file) => {
  return (dispatch) => {
    const item = {
      uid: file.data?.uid,
      name: file.data?.name,
      type: file.data?.type || 'http-request',
      pathname: file.meta?.pathname,
      filename: file.meta?.name,
      request: file.data?.request || {},
      ...file.data
    };

    dispatch(updateScratchRequest({ workspaceUid, item }));
  };
};

export const scratchRequestRemovedEvent = (workspaceUid, file) => {
  return (dispatch) => {
    const itemUid = file.data?.uid;

    // Close the tab for this scratch request
    if (itemUid) {
      dispatch(closeWorkspaceTab({ uid: itemUid }));
    }

    dispatch(removeScratchRequest({
      workspaceUid,
      pathname: file.meta?.pathname,
      itemUid
    }));
  };
};

/**
 * Generate a request name for scratch requests in the pattern "Untitled {Count}"
 * @param {Array} existingItems - The existing scratch request items
 * @returns {string} A request name like "Untitled 1", "Untitled 2", etc.
 */
const generateScratchRequestName = (existingItems) => {
  if (!existingItems || existingItems.length === 0) {
    return 'Untitled 1';
  }

  // Find the highest "Untitled X" number among scratch requests
  let maxNumber = 0;
  existingItems.forEach((item) => {
    const match = item.name?.match(/^Untitled (\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  // Increment from the highest number found, or start at 1 if none found
  const count = maxNumber + 1;
  return `Untitled ${count}`;
};

export const newScratchRequest = ({ workspaceUid, requestType, requestMethod, requestUrl, body }) => {
  return async (dispatch, getState) => {
    const state = getState();

    // Make sure scratch directory is mounted
    let tempDir = state.workspaces.scratchTempDirectories[workspaceUid];
    if (!tempDir) {
      tempDir = await dispatch(mountScratchDirectory(workspaceUid));
      if (!tempDir) {
        throw new Error('Failed to mount scratch directory');
      }
    }

    // Get existing scratch requests to generate unique name
    const scratchCollection = state.workspaces.scratchCollections[workspaceUid];
    const existingItems = scratchCollection?.items || [];
    const requestName = generateScratchRequestName(existingItems);

    // Create the request object
    const request = {
      method: requestMethod || 'GET',
      url: requestUrl || '',
      params: [],
      headers: [],
      body: body || {
        mode: 'none'
      },
      auth: {
        mode: 'none'
      },
      script: {
        req: '',
        res: ''
      },
      assertions: [],
      vars: {
        req: [],
        res: []
      },
      tests: '',
      docs: ''
    };

    // For graphql-request, ensure body is set correctly
    if (requestType === 'graphql-request' && body?.mode === 'graphql') {
      request.body = body;
    }

    // Build the full request item
    const requestItem = {
      name: requestName,
      type: requestType || 'http-request',
      request
    };

    // Generate filename (sanitized)
    const filename = `${requestName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bru`;
    const pathname = path.join(tempDir, filename);

    // Call IPC to create the file
    await ipcRenderer.invoke('renderer:new-scratch-request', {
      pathname,
      request: requestItem
    });

    // The file watcher will handle adding the request to Redux state
    // and we'll open the tab when the add event is received
  };
};

export const sendScratchRequest = ({ workspaceUid, itemUid }) => {
  return async (dispatch, getState) => {
    const state = getState();
    const scratchCollection = state.workspaces.scratchCollections[workspaceUid];
    if (!scratchCollection) {
      throw new Error('Scratch collection not found');
    }

    const item = scratchCollection.items.find((i) => i.uid === itemUid);
    if (!item) {
      throw new Error('Scratch request not found');
    }

    const { setScratchRequestResponse } = await import('../workspaces');
    const { uuid } = await import('utils/common');
    const { sendNetworkRequest } = await import('utils/network');
    const { cloneDeep } = await import('lodash');
    const { getGlobalEnvironmentVariables } = await import('utils/collections');

    const cancelTokenUid = uuid();

    // Set request state to sending
    dispatch(setScratchRequestResponse({
      workspaceUid,
      itemUid,
      requestState: 'sending',
      cancelTokenUid
    }));

    try {
      // Clone the item and collection for the request
      const itemCopy = cloneDeep(item);
      const collectionCopy = cloneDeep(scratchCollection);

      // Add global environment variables
      const { globalEnvironments, activeGlobalEnvironmentUid } = state.globalEnvironments;
      const globalEnvironmentVariables = getGlobalEnvironmentVariables({
        globalEnvironments,
        activeGlobalEnvironmentUid
      });
      collectionCopy.globalEnvironmentVariables = globalEnvironmentVariables;

      // Add request UID
      const requestUid = uuid();
      itemCopy.requestUid = requestUid;

      // Send the request using the network utilities
      const response = await sendNetworkRequest(
        itemCopy,
        collectionCopy,
        null, // No environment for scratch requests
        {} // No runtime variables
      );

      // Serialize the response for Redux
      const serializedResponse = {
        ...response,
        timeline: response.timeline?.map((entry) => ({
          ...entry,
          timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp
        }))
      };

      // Update state with response
      dispatch(setScratchRequestResponse({
        workspaceUid,
        itemUid,
        response: serializedResponse,
        requestState: 'received'
      }));

      return serializedResponse;
    } catch (error) {
      dispatch(setScratchRequestResponse({
        workspaceUid,
        itemUid,
        response: {
          error: error.message || 'Request failed'
        },
        requestState: 'error'
      }));
      throw error;
    }
  };
};

export const cancelScratchRequest = ({ workspaceUid, itemUid, cancelTokenUid }) => {
  return async (dispatch) => {
    try {
      // Call IPC to cancel the request
      await ipcRenderer.invoke('renderer:cancel-http-request', cancelTokenUid);

      const { setScratchRequestResponse } = await import('../workspaces');

      // Update state
      dispatch(setScratchRequestResponse({
        workspaceUid,
        itemUid,
        requestState: 'idle'
      }));
    } catch (error) {
      console.error('Error cancelling scratch request:', error);
    }
  };
};
