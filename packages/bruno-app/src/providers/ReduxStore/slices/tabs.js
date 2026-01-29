import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null
};

const tabTypeAlreadyExists = (tabs, collectionUid, type) => {
  return find(tabs, (tab) => tab.collectionUid === collectionUid && tab.type === type);
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    addTab: (state, action) => {
      const { uid, collectionUid, type, requestPaneTab, preview, exampleUid, itemUid } = action.payload;

      const nonReplaceableTabTypes = [
        'variables',
        'collection-runner',
        'environment-settings',
        'global-environment-settings',
        'preferences'
      ];

      const existingTab = find(state.tabs, (tab) => tab.uid === uid);
      if (existingTab) {
        state.activeTabUid = existingTab.uid;
        return;
      }

      if (nonReplaceableTabTypes.includes(type)) {
        const existingTab = tabTypeAlreadyExists(state.tabs, collectionUid, type);
        if (existingTab) {
          state.activeTabUid = existingTab.uid;
          return;
        }
      }

      // Determine the default requestPaneTab based on request type
      let defaultRequestPaneTab = 'params';
      if (type === 'grpc-request' || type === 'ws-request') {
        defaultRequestPaneTab = 'body';
      } else if (type === 'graphql-request') {
        defaultRequestPaneTab = 'query';
      }

      const lastTab = state.tabs[state.tabs.length - 1];
      if (state.tabs.length > 0 && lastTab.preview) {
        state.tabs[state.tabs.length - 1] = {
          uid,
          collectionUid,
          requestPaneWidth: null,
          requestPaneTab: requestPaneTab || defaultRequestPaneTab,
          responsePaneTab: 'response',
          responseFormat: null,
          responseViewTab: null,
          type: type || 'request',
          preview: preview !== undefined
            ? preview
            : !nonReplaceableTabTypes.includes(type),
          ...(uid ? { folderUid: uid } : {}),
          ...(exampleUid ? { exampleUid } : {}),
          ...(itemUid ? { itemUid } : {})
        };

        state.activeTabUid = uid;
        return;
      }

      state.tabs.push({
        uid,
        collectionUid,
        requestPaneWidth: null,
        requestPaneTab: requestPaneTab || defaultRequestPaneTab,
        responsePaneTab: 'response',
        responsePaneScrollPosition: null,
        responseFormat: null,
        responseViewTab: null,
        type: type || 'request',
        ...(uid ? { folderUid: uid } : {}),
        preview: preview !== undefined
          ? preview
          : !nonReplaceableTabTypes.includes(type),
        ...(exampleUid ? { exampleUid } : {}),
        ...(itemUid ? { itemUid } : {})
      });
      state.activeTabUid = uid;
    },
    focusTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
    },
    switchTab: (state, action) => {
      if (!state.tabs || !state.tabs.length) {
        state.activeTabUid = null;
        return;
      }

      const direction = action.payload.direction;

      const activeTabIndex = state.tabs.findIndex((t) => t.uid === state.activeTabUid);

      let toBeActivatedTabIndex = 0;

      if (direction == 'pageup') {
        toBeActivatedTabIndex = (activeTabIndex - 1 + state.tabs.length) % state.tabs.length;
      } else if (direction == 'pagedown') {
        toBeActivatedTabIndex = (activeTabIndex + 1) % state.tabs.length;
      }

      state.activeTabUid = state.tabs[toBeActivatedTabIndex].uid;
    },
    updateRequestPaneTabWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneWidth = action.payload.requestPaneWidth;
      }
    },
    updateRequestPaneTabHeight: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestPaneHeight = action.payload.requestPaneHeight;
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
    updateResponsePaneScrollPosition: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responsePaneScrollPosition = action.payload.scrollY;
      }
    },
    updateResponseFormat: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responseFormat = action.payload.responseFormat;
      }
    },
    updateResponseViewTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responseViewTab = action.payload.responseViewTab;
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
    },
    closeAllCollectionTabs: (state, action) => {
      const collectionUid = action.payload.collectionUid;
      state.tabs = filter(state.tabs, (t) => t.collectionUid !== collectionUid);
      state.activeTabUid = null;
    },
    makeTabPermanent: (state, action) => {
      const { uid } = action.payload;
      const tab = find(state.tabs, (t) => t.uid === uid);
      if (tab) {
        tab.preview = false;
      } else {
        console.error('Tab not found!');
      }
    },
    reorderTabs: (state, action) => {
      const { direction, sourceUid, targetUid } = action.payload;
      const tabs = state.tabs;

      let sourceIdx, targetIdx;
      if (direction) {
        sourceIdx = tabs.findIndex((t) => t.uid === state.activeTabUid);
        if (sourceIdx < 0) {
          return;
        }
        targetIdx = sourceIdx + (direction === -1 ? -1 : 1);
      } else {
        sourceIdx = tabs.findIndex((t) => t.uid === sourceUid);
        targetIdx = tabs.findIndex((t) => t.uid === targetUid);
      }

      const sourceBoundary = sourceIdx < 0;
      const targetBoundary = targetIdx < 0 || targetIdx >= tabs.length;
      if (sourceBoundary || sourceIdx === targetIdx || targetBoundary) {
        return;
      }

      const [moved] = tabs.splice(sourceIdx, 1);
      tabs.splice(targetIdx, 0, moved);

      state.tabs = tabs;
    }
  }
});

export const {
  addTab,
  focusTab,
  switchTab,
  updateRequestPaneTabWidth,
  updateRequestPaneTabHeight,
  updateRequestPaneTab,
  updateResponsePaneTab,
  updateResponsePaneScrollPosition,
  updateResponseFormat,
  updateResponseViewTab,
  closeTabs,
  closeAllCollectionTabs,
  makeTabPermanent,
  reorderTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
