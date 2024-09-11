import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null,
  ctrlTabCount: 0
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

const uidToTab = (state, uid) => find(state.tabs, (tab) => tab.uid === uid);

export const CTRL_TAB_ACTIONS = Object.freeze({
  ENTER: 'enter',
  PLUS: 'plus', // Ctrl+Tab
  MINUS: 'minus', // Ctrl+Shift+Tab
  SWITCH: 'switch'
});

const getCollectionTabs = (state) => {
  const activeTab = state.tabs.find((t) => t.uid === state.activeTabUid);
  if (!activeTab) return [];
  return state.tabs.filter((t) => t.collectionUid === activeTab.collectionUid);
};


export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const alreadyExists = find(state.tabs, (tab) => tab.uid === action.payload.uid);
      if (alreadyExists) {
        return;
      }

      if (
        ['variables', 'collection-settings', 'collection-runner', 'security-settings'].includes(action.payload.type)
      ) {
        const tab = tabTypeAlreadyExists(state.tabs, action.payload.collectionUid, action.payload.type);
        if (tab) {
          state.activeTabUid = tab.uid;
          return;
        }
      }

      state.tabs.push({
        uid: action.payload.uid,
        collectionUid: action.payload.collectionUid,
        requestPaneWidth: null,
        requestPaneTab: action.payload.requestPaneTab || 'params',
        responsePaneTab: 'response',
        type: action.payload.type || 'request',
        ...(action.payload.uid ? { folderUid: action.payload.uid } : {})
      });
      state.activeTabUid = action.payload.uid;
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
      state.ctrlTabCount = 0;
    },
    ctrlTab: (state, action) => {
      if (!state.tabs.length) {
        state.activeTabUid = null;
        return;
      }
      const collectionTabs = getCollectionTabs(state);
      if (state.ctrlTabCount === 0) {
        state.ctrlTabCount = collectionTabs.findIndex((tab) => tab.uid === state.activeTabUid);
      }

      switch (action.payload) {
        
        case CTRL_TAB_ACTIONS.PLUS:
          state.ctrlTabCount++;

          break;
          
        case CTRL_TAB_ACTIONS.MINUS:
          state.ctrlTabCount--;
          break;
          
        case CTRL_TAB_ACTIONS.SWITCH: {
          const collectionTabs = getCollectionTabs(state);
          if (state.ctrlTabCount !== 0 && collectionTabs.length > 1) {
            state.activeTabUid = collectionTabs[state.ctrlTabCount % collectionTabs.length].uid;
          }
          state.ctrlTabCount = 0;
          break;
        }
        
        default:
          return;
      }
    },
    switchTab: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabs = filter(state.tabs, t => t.collectionUid === activeTab?.collectionUid);

      if (!tabs.length) {
        return;
      }

      const direction = action.payload.direction;
      const activeTabIndex = tabs.findIndex(t => t.uid === state.activeTabUid);
      const tabCount = tabs.length;

      let newIndex;
      if (direction === 'pageup') {
        newIndex = (activeTabIndex - 1 + tabCount) % tabCount;
      } else if (direction === 'pagedown') {
        newIndex = (activeTabIndex + 1) % tabCount;
      } else {
        return; // Invalid direction, do nothing
      }

      state.activeTabUid = tabs[newIndex].uid;
    },
    updateRequestPaneTabWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneWidth = action.payload.requestPaneWidth;
      }
    },
    updateRequestPaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneTab = action.payload.requestPaneTab;
      }
    },
    updateResponsePaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responsePaneTab = action.payload.responsePaneTab;
      }
    },
    closeTabs: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabUids = action.payload.tabUids || [];

      // remove the tabs from the state
      state.tabs = filter(state.tabs, (t) => !tabUids.includes(t.uid));

      if (activeTab && state.tabs.length) {
        const { collectionUid } = activeTab;
        const activeTabStillExists = find(state.tabs, (t) => t.uid === state.activeTabUid);

        // if the active tab no longer exists, set the active tab to the last tab in the list
        // this implies that the active tab was closed
        if (!activeTabStillExists) {
          // load sibling tabs of the current collection
          const siblingTabs = filter(state.tabs, (t) => t.collectionUid === collectionUid);

          // if there are sibling tabs, set the active tab to the last sibling tab
          // otherwise, set the active tab to the last tab in the list
          if (siblingTabs && siblingTabs.length) {
            state.activeTabUid = last(siblingTabs).uid;
          } else {
            state.activeTabUid = last(state.tabs).uid;
          }
        }
      }

      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
      }

      state.ctrlTabCount = 0;
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = state.tabs.filter((t) => t.collectionUid !== collectionUid);
      state.activeTabUid = state.tabs.length ? state.tabs[0].uid : null;

      state.ctrlTabCount = 0;
    }
  }
});

export const {
  addTab,
  focusTab,
  ctrlTab,
  switchTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTab,
  updateResponsePaneTab,
  closeTabs,
  closeAllCollectionTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
