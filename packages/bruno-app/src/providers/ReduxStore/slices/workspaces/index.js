import { createSlice } from '@reduxjs/toolkit';
import { normalizePath } from 'utils/common/path';

const DEFAULT_WORKSPACE_UID = 'default';

const initialState = {
  workspaces: [],
  activeWorkspaceUid: DEFAULT_WORKSPACE_UID
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
  setWorkspaceDotEnvVariables
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
