import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

const initialState = {
  tabs: {},
  activeTabId: {}
};

const findTabById = (tabs, tabId) => {
  return find(tabs, (tab) => tab.uid === tabId);
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

const getDefaultRequestPaneTab = (type) => {
  if (type === 'grpc-request' || type === 'ws-request') {
    return 'body';
  } else if (type === 'graphql-request') {
    return 'query';
  }
  return 'params';
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const {
        uid,
        collectionUid,
        workspaceUid,
        location = 'request-pane',
        type,
        preview = true,
        properties = {},
        folderUid,
        itemUid,
        exampleUid
      } = action.payload;

      if (!state.tabs[location]) {
        state.tabs[location] = [];
      }

      if (!state.activeTabId[location]) {
        state.activeTabId[location] = null;
      }

      const locationTabs = state.tabs[location];
      const existingTab = findTabById(locationTabs, uid);

      if (existingTab) {
        state.activeTabId[location] = uid;
        return;
      }

      const nonReplaceableTabTypes = [
        'variables',
        'collection-runner',
        'security-settings'
      ];

      if (nonReplaceableTabTypes.includes(type)) {
        const existingTypeTab = tabTypeAlreadyExists(locationTabs, collectionUid, type);
        if (existingTypeTab) {
          state.activeTabId[location] = existingTypeTab.uid;
          return;
        }
      }

      const newTab = {
        uid,
        collectionUid,
        workspaceUid,
        type: type || 'request',
        preview: nonReplaceableTabTypes.includes(type) ? false : preview,
        folderUid,
        itemUid,
        exampleUid,
        properties: {
          requestPaneTab: properties.requestPaneTab || getDefaultRequestPaneTab(type),
          responsePaneTab: properties.responsePaneTab || 'response',
          requestPaneWidth: properties.requestPaneWidth || null,
          requestPaneHeight: properties.requestPaneHeight || null,
          responsePaneScrollPosition: properties.responsePaneScrollPosition || null,
          ...properties
        }
      };

      const lastTab = locationTabs[locationTabs.length - 1];
      if (locationTabs.length > 0 && lastTab?.preview && !nonReplaceableTabTypes.includes(lastTab.type)) {
        state.tabs[location][locationTabs.length - 1] = newTab;
        state.activeTabId[location] = uid;
        return;
      }

      state.tabs[location].push(newTab);
      state.activeTabId[location] = uid;
    },

    focusTab: (state, action) => {
      const { uid, location = 'request-pane' } = action.payload;
      if (state.tabs[location]) {
        const tab = findTabById(state.tabs[location], uid);
        if (tab) {
          state.activeTabId[location] = uid;
        }
      }
    },

    switchTab: (state, action) => {
      const { direction, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs || !tabs.length) return;

      const activeTabId = state.activeTabId[location];
      const activeTabIndex = tabs.findIndex((t) => t.uid === activeTabId);
      if (activeTabIndex === -1) return;

      let newIndex;
      if (direction === 'pageup' || direction === 'prev') {
        newIndex = (activeTabIndex - 1 + tabs.length) % tabs.length;
      } else if (direction === 'pagedown' || direction === 'next') {
        newIndex = (activeTabIndex + 1) % tabs.length;
      } else {
        return;
      }

      state.activeTabId[location] = tabs[newIndex].uid;
    },

    updateTab: (state, action) => {
      const { uid, location = 'request-pane', properties } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab && properties) {
        tab.properties = { ...tab.properties, ...properties };
      }
    },

    closeTabs: (state, action) => {
      const { tabUids, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const activeTabId = state.activeTabId[location];
      const activeTab = findTabById(tabs, activeTabId);

      state.tabs[location] = filter(tabs, (t) => !tabUids.includes(t.uid));

      const remainingTabs = state.tabs[location];
      if (activeTab && remainingTabs.length) {
        const activeTabStillExists = findTabById(remainingTabs, activeTabId);

        if (!activeTabStillExists) {
          const { collectionUid } = activeTab;
          const siblingTabs = filter(remainingTabs, (t) => t.collectionUid === collectionUid);

          if (siblingTabs.length) {
            state.activeTabId[location] = last(siblingTabs).uid;
          } else {
            state.activeTabId[location] = last(remainingTabs).uid;
          }
        }
      } else if (!remainingTabs.length) {
        state.activeTabId[location] = null;
      }
    },

    closeOtherTabs: (state, action) => {
      const { uid, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      state.tabs[location] = tabs.filter((t) => t.uid === uid || t.permanent);
      state.activeTabId[location] = uid;
    },

    closeTabsToLeft: (state, action) => {
      const { uid, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tabIndex = tabs.findIndex((t) => t.uid === uid);
      if (tabIndex === -1) return;

      const tabsToClose = tabs.slice(0, tabIndex).filter((t) => !t.permanent);
      const tabIdsToClose = tabsToClose.map((t) => t.uid);

      state.tabs[location] = filter(tabs, (t) => !tabIdsToClose.includes(t.uid));

      if (tabIdsToClose.includes(state.activeTabId[location])) {
        state.activeTabId[location] = uid;
      }
    },

    closeTabsToRight: (state, action) => {
      const { uid, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tabIndex = tabs.findIndex((t) => t.uid === uid);
      if (tabIndex === -1) return;

      const tabsToClose = tabs.slice(tabIndex + 1).filter((t) => !t.permanent);
      const tabIdsToClose = tabsToClose.map((t) => t.uid);

      state.tabs[location] = filter(tabs, (t) => !tabIdsToClose.includes(t.uid));

      if (tabIdsToClose.includes(state.activeTabId[location])) {
        state.activeTabId[location] = uid;
      }
    },

    closeAllTabs: (state, action) => {
      const { location = 'request-pane', preservePermanent = true } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      if (preservePermanent) {
        state.tabs[location] = tabs.filter((t) => t.permanent);
        state.activeTabId[location] = state.tabs[location][0]?.uid || null;
      } else {
        state.tabs[location] = [];
        state.activeTabId[location] = null;
      }
    },

    closeAllCollectionTabs: (state, action) => {
      const { collectionUid, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      state.tabs[location] = filter(tabs, (t) => t.collectionUid !== collectionUid);

      const remainingTabs = state.tabs[location];
      if (remainingTabs.length) {
        const currentActive = findTabById(remainingTabs, state.activeTabId[location]);
        if (!currentActive) {
          state.activeTabId[location] = last(remainingTabs).uid;
        }
      } else {
        state.activeTabId[location] = null;
      }
    },

    makeTabPermanent: (state, action) => {
      const { uid, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.preview = false;
      }
    },

    reorderTabs: (state, action) => {
      const { sourceUid, targetUid, direction, location = 'request-pane' } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      let sourceIdx, targetIdx;

      if (direction !== undefined) {
        sourceIdx = tabs.findIndex((t) => t.uid === state.activeTabId[location]);
        if (sourceIdx < 0) return;
        targetIdx = sourceIdx + direction;
      } else {
        sourceIdx = tabs.findIndex((t) => t.uid === sourceUid);
        targetIdx = tabs.findIndex((t) => t.uid === targetUid);
      }

      if (sourceIdx < 0 || targetIdx < 0 || targetIdx >= tabs.length || sourceIdx === targetIdx) {
        return;
      }

      const [moved] = tabs.splice(sourceIdx, 1);
      tabs.splice(targetIdx, 0, moved);
    },

    initLocation: (state, action) => {
      const { location, tabs = [], activeTabId = null } = action.payload;
      if (!state.tabs[location]) {
        state.tabs[location] = tabs;
        state.activeTabId[location] = activeTabId || tabs[0]?.uid || null;
      }
    },

    removeLocation: (state, action) => {
      const { location } = action.payload;
      delete state.tabs[location];
      delete state.activeTabId[location];
    },

    updateResponsePaneScrollPosition: (state, action) => {
      const { uid, location = 'request-pane', scrollY } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.properties = tab.properties || {};
        tab.properties.responsePaneScrollPosition = scrollY;
      }
    },

    updateRequestPaneTab: (state, action) => {
      const { uid, location = 'request-pane', requestPaneTab } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.properties = tab.properties || {};
        tab.properties.requestPaneTab = requestPaneTab;
      }
    },

    updateResponsePaneTab: (state, action) => {
      const { uid, location = 'request-pane', responsePaneTab } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.properties = tab.properties || {};
        tab.properties.responsePaneTab = responsePaneTab;
      }
    },

    updateRequestPaneTabWidth: (state, action) => {
      const { uid, location = 'request-pane', requestPaneWidth } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.properties = tab.properties || {};
        tab.properties.requestPaneWidth = requestPaneWidth;
      }
    },

    updateRequestPaneTabHeight: (state, action) => {
      const { uid, location = 'request-pane', requestPaneHeight } = action.payload;
      const tabs = state.tabs[location];
      if (!tabs) return;

      const tab = findTabById(tabs, uid);
      if (tab) {
        tab.properties = tab.properties || {};
        tab.properties.requestPaneHeight = requestPaneHeight;
      }
    }
  }
});

export const {
  addTab,
  focusTab,
  switchTab,
  updateTab,
  closeTabs,
  closeOtherTabs,
  closeTabsToLeft,
  closeTabsToRight,
  closeAllTabs,
  closeAllCollectionTabs,
  makeTabPermanent,
  reorderTabs,
  initLocation,
  removeLocation,
  updateResponsePaneScrollPosition,
  updateRequestPaneTab,
  updateResponsePaneTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTabHeight
} = tabsSlice.actions;

export const selectTabsForLocation = (location) => (state) => state.tabs.tabs[location] || [];
export const selectActiveTabIdForLocation = (location) => (state) => state.tabs.activeTabId[location] || null;
export const selectActiveTabForLocation = (location) => (state) => {
  const tabs = state.tabs.tabs[location] || [];
  const activeTabId = state.tabs.activeTabId[location];
  return find(tabs, (t) => t.uid === activeTabId) || null;
};

export default tabsSlice.reducer;
