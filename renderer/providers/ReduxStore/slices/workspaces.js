import { createSlice } from '@reduxjs/toolkit';
import { uuid } from 'utils/common';

const initialState = {
  workspaces: [{
    uid: 123,
    name: 'My Workspace'
  },{
    uid: 234,
    name: 'workspace B'
  },{
    uid: 345,
    name: 'workspace C'
  }],
  activeWorkspaceUid: 123
};

export const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
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
  selectWorkspace,
  renameWorkspace,
  deleteWorkspace,
  addWorkspace
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
