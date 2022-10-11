import { createSlice } from '@reduxjs/toolkit';
import { each } from 'lodash';
import { uuid } from 'utils/common';

const initialState = {
  workspaces: [],
  activeWorkspaceUid: null
};

export const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    loadWorkspaces: (state, action) => {
      const workspaces = action.payload.workspaces;

      if(!workspaces || !workspaces.length) {
        const uid = uuid();
        state.workspaces.push({
          uid: uid,
          name: 'My workspace'
        });
        state.activeWorkspaceUid = uid;
        return;
      }

      each(workspaces, w => state.workspaces.push(w));
    },
    selectWorkspace: (state, action) => {
      state.activeWorkspaceUid = action.payload.uid;
    },
    renameWorkspace: (state, action) => {
      const { name, uid } = action.payload;
      const { workspaces } = state;
      const workspaceIndex = workspaces.findIndex(workspace => workspace.uid == uid);
      workspaces[workspaceIndex].name = name;
    },
    deleteWorkspace: (state, action) => {
      if(state.activeWorkspaceUid === action.payload.workspaceUid) {
        throw new Error("User cannot delete current workspace");
      }
      state.workspaces = state.workspaces.filter((workspace) => workspace.uid !== action.payload.workspaceUid);
    },
    addWorkspace: (state, action) => {
      const newWorkspace = {
        uid: uuid(),
        name: action.payload.name
      }
      state.workspaces.push(newWorkspace);
    }
  }
});

export const {
  loadWorkspaces,
  selectWorkspace,
  renameWorkspace,
  deleteWorkspace,
  addWorkspace
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
