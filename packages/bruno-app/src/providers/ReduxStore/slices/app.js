import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isDragging: false,
  idbConnectionReady: false,
  leftSidebarWidth: 270,
  leftMenuBarOpen: true,
  screenWidth: 500,
  showHomePage: false
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    idbConnectionReady: (state) => {
      state.idbConnectionReady = true;
    },
    toggleLeftMenuBar: (state) => {
      state.leftMenuBarOpen = !state.leftMenuBarOpen;
      state.leftSidebarWidth = state.leftMenuBarOpen ? 270 : 222;
    },
    refreshScreenWidth: (state) => {
      state.screenWidth = window.innerWidth;
    },
    updateLeftSidebarWidth: (state, action) => {
      state.leftSidebarWidth = action.payload.leftSidebarWidth;
    },
    updateIsDragging: (state, action) => {
      state.isDragging = action.payload.isDragging;
    },
    showHomePage: (state) => {
      state.showHomePage = true;
    },
    hideHomePage: (state) => {
      state.showHomePage = false;
    }
  }
});

export const { idbConnectionReady, toggleLeftMenuBar, refreshScreenWidth, updateLeftSidebarWidth, updateIsDragging, showHomePage, hideHomePage } = appSlice.actions;

export default appSlice.reducer;
