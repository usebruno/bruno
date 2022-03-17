import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  leftMenuBarOpen: true,
  leftSidebarWidth: 270
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleLeftMenuBar: (state) => {
      state.leftMenuBarOpen = !state.leftMenuBarOpen;
      state.leftSidebarWidth = state.leftMenuBarOpen ? 270 : 222;
    }
  }
});

export const { toggleLeftMenuBar } = appSlice.actions;

export default appSlice.reducer;
