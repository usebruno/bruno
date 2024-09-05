import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null,
  ctrlTabIndex: null
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

const moveCtrlTabIndex = (state, step) => {
  const collectionTabs = getCollectionTabs(state);
  if (collectionTabs.length <= 1 || state.ctrlTabIndex === null) {
    return;
  }
  // Update the ctrlTabIndex within the collection
  state.ctrlTabIndex = (state.ctrlTabIndex + step + collectionTabs.length) % collectionTabs.length;
};

const moveActiveTab = (state, step) => {
  const collectionTabs = getCollectionTabs(state);
  // If there are 1 or fewer tabs in the collection, do nothing
  if (collectionTabs.length <= 1) {
    return;
  }

  const activeTabIndex = collectionTabs.findIndex((t) => t.uid === state.activeTabUid);

  if (activeTabIndex !== -1) {
    const nextIndex = (activeTabIndex + step + collectionTabs.length) % collectionTabs.length;
    state.activeTabUid = collectionTabs[nextIndex].uid;
  }
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
    },
    ctrlTab: (state, action) => {
      if (!state.tabs.length) {
        state.activeTabUid = null;
        return;
      }

      switch (action.payload) {
        case CTRL_TAB_ACTIONS.ENTER: {
          const collectionTabs = getCollectionTabs(state);
          if (state.ctrlTabIndex === null) {
            state.ctrlTabIndex = collectionTabs.findIndex((tab) => tab.uid === state.activeTabUid);
          }
          break;
        }
        
        case CTRL_TAB_ACTIONS.PLUS:
          moveCtrlTabIndex(state, 1);
          break;
          
        case CTRL_TAB_ACTIONS.MINUS:
          moveCtrlTabIndex(state, -1);
          break;
          
        case CTRL_TAB_ACTIONS.SWITCH: {
          const collectionTabs = getCollectionTabs(state);
          if (state.ctrlTabIndex !== null && collectionTabs.length > 1) {
            state.activeTabUid = collectionTabs[state.ctrlTabIndex].uid;
            state.ctrlTabIndex = null;
          }
          state.ctrlTabIndex = null;
          break;
        }
        
        default:
          return;
      }
    },
    switchTab: (state, action) => {
      if (!state.tabs.length) return;

      const direction = action.payload.direction;
      direction === 'pageup' ? moveActiveTab(state, -1) : moveActiveTab(state, 1);
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

      // Remove closed tabs
      state.tabs = state.tabs.filter((t) => !tabUids.includes(t.uid));

      // Reset the active tab if necessary
      if (state.activeTabUid && !state.tabs.find((t) => t.uid === state.activeTabUid)) {
        state.activeTabUid = state.tabs.length ? state.tabs[0].uid : null;
      }

      state.ctrlTabIndex = null;
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = state.tabs.filter((t) => t.collectionUid !== collectionUid);
      state.activeTabUid = state.tabs.length ? state.tabs[0].uid : null;

      state.ctrlTabIndex = null;
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
