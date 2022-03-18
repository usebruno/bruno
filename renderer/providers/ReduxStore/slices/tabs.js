import find from 'lodash/find';
import filter from 'lodash/filter';
import last from 'lodash/last';
import { createSlice } from '@reduxjs/toolkit'

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null,
  hasChanges: false
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
      state.tabs = filter(state.tabs, (t) => t.uid !== action.payload.tabUid);

      if(state.tabs && state.tabs.length) {
        // todo: closing tab needs to focus on the right adjacent tab
        state.activeTabUid = last(state.tabs).uid;
      } else {
        state.activeTabUid = null;
      }
    },
    requestChanged: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid == action.payload.itemUid);
      if(tab) {
        tab.hasChanges = true;
      }
    },
    requestSaved: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid == action.payload.itemUid);
      if(tab) {
        tab.hasChanges = false;
      }
    },
  }
});

export const {
  addTab,
  focusTab,
  closeTab,
  requestChanged,
  requestSaved
} = tabsSlice.actions;

export default tabsSlice.reducer;
