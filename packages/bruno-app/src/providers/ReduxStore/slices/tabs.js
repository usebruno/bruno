import find from 'lodash/find';
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
        collectionUid: action.payload.collectionUid,
        requestPaneWidth: null,
        requestPaneTab: 'params',
        responsePaneTab: 'response'
      });
      state.activeTabUid = action.payload.uid;
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
    },
    updateRequestPaneTabWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if(tab) {
        tab.requestPaneWidth = action.payload.requestPaneWidth;
      }
    },
    updateRequestPaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if(tab) {
        tab.requestPaneTab = action.payload.requestPaneTab;
      }
    },
    updateResponsePaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if(tab) {
        tab.responsePaneTab = action.payload.responsePaneTab;
      }
    },
    closeTabs: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabUids = action.payload.tabUids || [];
      state.tabs = filter(state.tabs, (t) => !tabUids.includes(t.uid));

      if(activeTab && state.tabs.length) {
        const { collectionUid } = activeTab;
        const activeTabStillExists = find(state.tabs, (t) => t.uid === state.activeTabUid);

        if(!activeTabStillExists) {
          // attempt to load sibling tabs (based on collections) of the dead tab
          const siblingTabs = filter(state.tabs, (t) => t.collectionUid === collectionUid);

          if(siblingTabs && siblingTabs.length) {
            state.activeTabUid = last(siblingTabs).uid;
          } else {
            state.activeTabUid = last(state.tabs).uid;
          }
        }
      }
    },
    // todo: implement this
    // the refreshTabs us currently not beng used
    // the goal is to have the main page listen to unlink events and
    // remove tabs which are no longer valid
    refreshTabs: (state, action) => {
      // remove all tabs that we don't have itemUids in all loaded collections
      const allItemUids = action.payload.allItemUids || [];
      state.tabs = filter(state.tabs, (tab) => {
        return allItemUids.includes(tab.uid);
      });

      // adjust the activeTabUid
      const collectionUid = action.payload.activeCollectionUid;
      const collectionTabs = filter(state.tabs, (t) => t.collectionUid === collectionUid);

      if(!collectionTabs || !collectionTabs.length) {
        state.activeTabUid = null;
        return;
      }

      const activeTabStillExists = find(state.tabs, (t) => t.uid === state.activeTabUid);

      if(!activeTabStillExists) {
        // todo: closing tab needs to focus on the right adjacent tab
        state.activeTabUid = last(collectionTabs).uid;
      }
    }
  }
});

export const {
  addTab,
  focusTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTab,
  updateResponsePaneTab,
  closeTabs,
  refreshTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
