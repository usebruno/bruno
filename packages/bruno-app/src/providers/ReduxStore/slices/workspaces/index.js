import { createSlice } from '@reduxjs/toolkit';
import { normalizePath } from 'utils/common/path';

const DEFAULT_WORKSPACE_UID = 'default';

const initialState = {
  workspaces: [],
  activeWorkspaceUid: DEFAULT_WORKSPACE_UID,
  // Scratch request state - workspace-level temporary requests
  scratchTempDirectories: {}, // workspaceUid -> temp directory path
  scratchCollections: {} // workspaceUid -> virtual scratch collection object
};

export const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action) => {
      state.activeWorkspaceUid = action.payload;
    },

    createWorkspace: (state, action) => {
      const workspace = action.payload;
      workspace.collections = workspace.collections || [];

      const existingWorkspace = state.workspaces.find((w) => w.uid === workspace.uid);
      if (!existingWorkspace) {
        state.workspaces.push(workspace);
      } else {
        Object.assign(existingWorkspace, workspace);
      }
    },

    removeWorkspace: (state, action) => {
      const workspaceUid = action.payload;
      state.workspaces = state.workspaces.filter((w) => w.uid !== workspaceUid);

      if (state.activeWorkspaceUid === workspaceUid) {
        state.activeWorkspaceUid = DEFAULT_WORKSPACE_UID;
      }
    },

    updateWorkspace: (state, action) => {
      const { uid, ...updates } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === uid);
      if (workspace) {
        Object.assign(workspace, updates);
      }
    },

    addCollectionToWorkspace: (state, action) => {
      const { workspaceUid, collection } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === workspaceUid);
      if (workspace) {
        workspace.collections = workspace.collections || [];
        const existingCollection = workspace.collections.find((c) =>
          c.uid === collection.uid || c.path === collection.path);
        if (!existingCollection) {
          workspace.collections.push(collection);
        }
      }
    },

    removeCollectionFromWorkspace: (state, action) => {
      const { workspaceUid, collectionLocation } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === workspaceUid);
      if (workspace?.collections) {
        const normalizedLocation = normalizePath(collectionLocation);
        workspace.collections = workspace.collections.filter((c) => {
          const normalizedPath = normalizePath(c.path);
          return normalizedPath !== normalizedLocation;
        });
      }
    },

    updateWorkspaceLoadingState: (state, action) => {
      const { workspaceUid, loadingState } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === workspaceUid);
      if (workspace) {
        workspace.loadingState = loadingState;
      }
    },

    workspaceDotEnvUpdateEvent: (state, action) => {
      const { workspaceUid, processEnvVariables } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === workspaceUid);
      if (workspace) {
        workspace.processEnvVariables = processEnvVariables;
      }
    },

    setWorkspaceDotEnvVariables: (state, action) => {
      const { workspaceUid, variables, exists, filename = '.env' } = action.payload;
      const workspace = state.workspaces.find((w) => w.uid === workspaceUid);

      if (workspace) {
        if (!workspace.dotEnvFiles) {
          workspace.dotEnvFiles = [];
        }

        const existingIndex = workspace.dotEnvFiles.findIndex((f) => f.filename === filename);
        if (existingIndex >= 0) {
          if (exists) {
            workspace.dotEnvFiles[existingIndex] = { filename, variables, exists };
          } else {
            workspace.dotEnvFiles.splice(existingIndex, 1);
          }
        } else if (exists) {
          workspace.dotEnvFiles.push({ filename, variables, exists });
        }

        workspace.dotEnvFiles.sort((a, b) => {
          if (a.filename === '.env') return -1;
          if (b.filename === '.env') return 1;
          return a.filename.localeCompare(b.filename);
        });

        const mainEnvFile = workspace.dotEnvFiles.find((f) => f.filename === '.env');
        workspace.dotEnvVariables = mainEnvFile?.variables || [];
        workspace.dotEnvExists = mainEnvFile?.exists || false;
      }
    },

    // Scratch request reducers
    addScratchTempDirectory: (state, action) => {
      const { workspaceUid, tempDirectoryPath } = action.payload;
      state.scratchTempDirectories[workspaceUid] = tempDirectoryPath;
    },

    initScratchCollection: (state, action) => {
      const { workspaceUid, tempDirectoryPath } = action.payload;
      // Create virtual scratch collection for this workspace
      state.scratchCollections[workspaceUid] = {
        uid: `scratch-${workspaceUid}`,
        name: 'Scratch Requests',
        pathname: tempDirectoryPath,
        items: [],
        environments: [],
        activeEnvironmentUid: null,
        brunoConfig: { version: '1', type: 'scratch' },
        format: 'bru'
      };
    },

    addScratchRequest: (state, action) => {
      const { workspaceUid, item } = action.payload;
      const scratchCollection = state.scratchCollections[workspaceUid];
      if (scratchCollection) {
        // Check if item already exists (by pathname)
        const existingIndex = scratchCollection.items.findIndex(
          (i) => i.pathname === item.pathname
        );
        if (existingIndex >= 0) {
          // Update existing item
          scratchCollection.items[existingIndex] = item;
        } else {
          // Add new item
          scratchCollection.items.push(item);
        }
      }
    },

    updateScratchRequest: (state, action) => {
      const { workspaceUid, item } = action.payload;
      const scratchCollection = state.scratchCollections[workspaceUid];
      if (scratchCollection) {
        const index = scratchCollection.items.findIndex(
          (i) => i.pathname === item.pathname || i.uid === item.uid
        );
        if (index >= 0) {
          scratchCollection.items[index] = {
            ...scratchCollection.items[index],
            ...item
          };
        }
      }
    },

    removeScratchRequest: (state, action) => {
      const { workspaceUid, pathname, itemUid } = action.payload;
      const scratchCollection = state.scratchCollections[workspaceUid];
      if (scratchCollection) {
        scratchCollection.items = scratchCollection.items.filter(
          (i) => i.pathname !== pathname && i.uid !== itemUid
        );
      }
    },

    updateScratchRequestDraft: (state, action) => {
      const { workspaceUid, itemUid, draft } = action.payload;
      const scratchCollection = state.scratchCollections[workspaceUid];
      if (scratchCollection) {
        const item = scratchCollection.items.find((i) => i.uid === itemUid);
        if (item) {
          item.draft = draft;
        }
      }
    },

    setScratchRequestResponse: (state, action) => {
      const { workspaceUid, itemUid, response, requestState, cancelTokenUid } = action.payload;
      const scratchCollection = state.scratchCollections[workspaceUid];
      if (scratchCollection) {
        const item = scratchCollection.items.find((i) => i.uid === itemUid);
        if (item) {
          if (response !== undefined) item.response = response;
          if (requestState !== undefined) item.requestState = requestState;
          if (cancelTokenUid !== undefined) item.cancelTokenUid = cancelTokenUid;
        }
      }
    },

    clearScratchCollection: (state, action) => {
      const { workspaceUid } = action.payload;
      if (state.scratchCollections[workspaceUid]) {
        state.scratchCollections[workspaceUid].items = [];
      }
      delete state.scratchTempDirectories[workspaceUid];
    }
  }
});

export const {
  setActiveWorkspace,
  createWorkspace,
  removeWorkspace,
  updateWorkspace,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace,
  updateWorkspaceLoadingState,
  workspaceDotEnvUpdateEvent,
  setWorkspaceDotEnvVariables,
  // Scratch request actions
  addScratchTempDirectory,
  initScratchCollection,
  addScratchRequest,
  updateScratchRequest,
  removeScratchRequest,
  updateScratchRequestDraft,
  setScratchRequestResponse,
  clearScratchCollection
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
