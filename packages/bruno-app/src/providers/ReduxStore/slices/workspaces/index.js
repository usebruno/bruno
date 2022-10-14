import { createSlice } from '@reduxjs/toolkit';
import find from 'lodash/find';
import filter from 'lodash/filter';

const initialState = {
  workspaces: [],
  activeWorkspaceUid: null
};

export const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    loadWorkspaces: (state, action) => {
      state.workspaces = action.payload.workspaces;

      if(state.workspaces && state.workspaces.length) {
        state.activeWorkspaceUid = state.workspaces[0].uid;
      }
    },
    selectWorkspace: (state, action) => {
      state.activeWorkspaceUid = action.payload.uid;
    },
    renameWorkspace: (state, action) => {
      const { name, uid } = action.payload;
      const workspace = find(state.workspaces, (w) => w.uid === uid);

      if(workspace) {
        workspace.name = name;
      }
    },
    deleteWorkspace: (state, action) => {
      if(state.activeWorkspaceUid === action.payload.workspaceUid) {
        throw new Error("User cannot delete current workspace");
      }
      state.workspaces = state.workspaces.filter((workspace) => workspace.uid !== action.payload.workspaceUid);
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload.workspace);
    },
    addCollectionToWorkspace:  (state, action) => {
      const { workspaceUid, collectionUid } = action.payload;
      const workspace = find(state.workspaces, (w) => w.uid === workspaceUid);

      if(workspace) {
        if(workspace.collectionUids && workspace.collectionUids.length) {
          if(!workspace.collectionUids.includes(collectionUid)) {
            workspace.collectionUids.push(collectionUid);
          }
        } else {
          workspace.collectionUids = [collectionUid];
        }
      }
    },
    removeCollectionFromWorkspace:  (state, action) => {
      const { workspaceUid, collectionUid } = action.payload;
      const workspace = find(state.workspaces, (w) => w.uid === workspaceUid);

      if(workspace && workspace.collectionUids && workspace.collectionUids.length) {
        workspace.collectionUids = filter(workspace.collectionUids, (uid) => uid !== collectionUid);
      }
    }
  }
});

export const {
  loadWorkspaces,
  selectWorkspace,
  renameWorkspace,
  deleteWorkspace,
  addWorkspace,
  addCollectionToWorkspace,
  removeCollectionFromWorkspace
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
