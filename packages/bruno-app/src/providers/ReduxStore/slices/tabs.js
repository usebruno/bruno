import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null,
  ctrlTabStack: [],
  ctrlTabIndex: null
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

const uidToTab = (state, uid) => find(state.tabs, (tab) => tab.uid === uid);

const focusTabWithStack = (state, uid) => {
  if (state.activeTabUid === uid) {
    return;
  }
  if (state.activeTabUid) {
    const previousTab = uidToTab(state, state.activeTabUid);
    const currentTab = uidToTab(state, uid);
    state.ctrlTabStack = [
      ...filter(state.ctrlTabStack, (tab) => tab.uid !== state.activeTabUid && tab.uid !== uid),
      ...(previousTab ? [previousTab] : []), // if previousTab is undefined, it means the tab was closed while focused
      currentTab
    ];
  }
  state.activeTabUid = uid;
};

const removeClosedTabs = (state, filterFunction) => {
  state.tabs = filter(state.tabs, filterFunction);
  state.ctrlTabStack = filter(state.ctrlTabStack, filterFunction);
  if (state.ctrlTabStack.length < 2) {
    state.ctrlTabIndex = null;
  }
};

export const CTRL_TAB_ACTIONS = Object.freeze({
  ENTER: 'enter',
  PLUS: 'plus',
  MINUS: 'minus',
  SWITCH: 'switch'
});

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const alreadyExists = find(state.tabs, (tab) => tab.uid === action.payload.uid);
      if (alreadyExists) {
        return;
      }

      if (['variables', 'collection-settings', 'collection-runner'].includes(action.payload.type)) {
        const tab = tabTypeAlreadyExists(state.tabs, action.payload.collectionUid, action.payload.type);
        if (tab) {
          focusTabWithStack(state, tab.uid);
          return;
        }
      }

      state.tabs.push({
        uid: action.payload.uid,
        collectionUid: action.payload.collectionUid,
        requestPaneWidth: null,
        requestPaneTab: action.payload.requestPaneTab || 'params',
        responsePaneTab: 'response',
        type: action.payload.type || 'request'
      });
      focusTabWithStack(state, action.payload.uid);
    },
    focusTab: (state, action) => {
      focusTabWithStack(state, action.payload.uid);
    },
    focusCtrlTab: (state, action) => {
      focusTabWithStack(state, action.payload.uid);
      state.ctrlTabIndex = null;
    },
    ctrlTab: (state, action) => {
      if (state.ctrlTabStack.length < 2) {
        return;
      }
      switch (action.payload) {
        case CTRL_TAB_ACTIONS.ENTER:
          state.ctrlTabIndex = -2;
          return;
        case CTRL_TAB_ACTIONS.PLUS:
          state.ctrlTabIndex = (state.ctrlTabIndex - 1) % state.ctrlTabStack.length;
          return;
        case CTRL_TAB_ACTIONS.MINUS:
          state.ctrlTabIndex = (state.ctrlTabIndex + 1) % state.ctrlTabStack.length;
          return;
        case CTRL_TAB_ACTIONS.SWITCH:
          if (state.ctrlTabIndex === null) {
            // if already switched (eg, from click), do nothing
            return;
          }
          focusTabWithStack(state, state.ctrlTabStack.at(state.ctrlTabIndex).uid);
          state.ctrlTabIndex = null;
          return;
      }
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
      removeClosedTabs(state, (t) => !tabUids.includes(t.uid));

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
            focusTabWithStack(state, last(siblingTabs).uid);
          } else {
            focusTabWithStack(state, last(state.tabs).uid);
          }
        }
      }

      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
      }
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      removeClosedTabs(state, (t) => t.collectionUid !== collectionUid);
      state.activeTabUid = null;
    }
  }
});

export const selectCtrlTabAction = (uid) => (dispatch) => {
  dispatch(
    tabsSlice.actions.focusCtrlTab({
      uid
    })
  );
};

export const {
  addTab,
  focusTab,
  ctrlTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTab,
  updateResponsePaneTab,
  closeTabs,
  closeAllCollectionTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
