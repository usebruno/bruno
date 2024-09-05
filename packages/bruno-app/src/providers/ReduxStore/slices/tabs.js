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

const moveCtrlTabIndex = (state, step) => {
  if (state.ctrlTabIndex !== null) {
    state.ctrlTabIndex = (state.ctrlTabIndex + step + state.tabs.length) % state.tabs.length;
  }
};

const moveActiveTab = (state, step) => {
  const activeTabIndex = state.tabs.findIndex((t) => t.uid === state.activeTabUid);
  if (activeTabIndex !== -1) {
    const nextIndex = (activeTabIndex + step + state.tabs.length) % state.tabs.length;
    state.activeTabUid = state.tabs[nextIndex].uid;
  }
};

const focusTabLinear = (state, uid) => {
  if (state.activeTabUid === uid) {
    return;
  }
  state.activeTabUid = uid;
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
      if (!state.tabs || state.tabs.length < 2) {
        state.activeTabUid = null;
        return;
      }

      switch (action.payload) {
        case CTRL_TAB_ACTIONS.ENTER:
          state.ctrlTabIndex =
            state.ctrlTabIndex === null
              ? state.tabs.findIndex((tab) => tab.uid === state.activeTabUid)
              : state.ctrlTabIndex;
          break;
        case CTRL_TAB_ACTIONS.PLUS:
          moveCtrlTabIndex(state, 1);
          break;
        case CTRL_TAB_ACTIONS.MINUS:
          moveCtrlTabIndex(state, -1);
          break;
        case CTRL_TAB_ACTIONS.SWITCH:
          if (state.ctrlTabIndex !== null) {
            state.activeTabUid = state.tabs[state.ctrlTabIndex].uid;
            state.ctrlTabIndex = null;
          }
          break;
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

      // Update ctrlTabIndex to match the new position of activeTabUid
      if (state.activeTabUid) {
        // state.ctrlTabIndex = state.tabs.findIndex((tab) => tab.uid === state.activeTabUid);
        state.ctrlTabIndex = null;
      } else {
        state.ctrlTabIndex = null; // Reset if no tabs left
      }
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = state.tabs.filter((t) => t.collectionUid !== collectionUid);
      state.activeTabUid = state.tabs.length ? state.tabs[0].uid : null;

      if (state.activeTabUid) {
        state.ctrlTabIndex = state.tabs.findIndex((tab) => tab.uid === state.activeTabUid);
      } else {
        state.ctrlTabIndex = null; // Reset if no tabs left
      }
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
