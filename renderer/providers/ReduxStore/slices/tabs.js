import filter from 'lodash/filter';
import last from 'lodash/last';
import { createSlice } from '@reduxjs/toolkit'

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      state.tabs.push({
        uid: action.payload.uid,
        collectionUid: action.payload.collectionUid
      });
      state.activeTabUid = action.payload.uid;
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
    },
    closeTab: (state, action) => {
      state.tabs = filter(state.tabs, (t) => t.uid !== action.payload);

      if(state.tabs && state.tabs.length) {
        // todo: closing tab needs to focus on the right adjacent tab
        state.activeTabUid = last(state.tabs).uid;
      } else {
        state.activeTabUid = null;
      }
    }
  }
});

export const {
  addTab,
  focusTab,
  closeTab
} = tabsSlice.actions;

export default tabsSlice.reducer;
