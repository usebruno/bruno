import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  idbConnectionReady: false,
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
    },
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    }
  }
});

export const { toggleLeftMenuBar, idbConnectionReady } = appSlice.actions;

export default appSlice.reducer;
