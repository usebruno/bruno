import { createSlice } from '@reduxjs/toolkit'

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
  }
});

export const {
    selectWorkspace
} = workspacesSlice.actions;

export default workspacesSlice.reducer;
