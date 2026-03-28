import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

// todo: errors should be tracked in each slice and displayed as toasts

const initialState = {
  tabs: [],
  activeTabUid: null,
  showCloseAllConfirmation: false,
  closedTabs: [],
  lastActiveCollectionUid: null
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
        'preferences',
        'workspaceOverview',
        'workspaceEnvironments',
        'openapi-sync',
        'openapi-spec'
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
          scriptPaneTab: null,
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
        responseFilter: null,
        responseFilterExpanded: false,
        gqlDocsOpen: false,
        tableColumnWidths: {},
        scriptPaneTab: null,
        docsEditing: false,
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
      const { uid } = action.payload;
      const tabExists = state.tabs.some((t) => t.uid === uid);
      if (tabExists) {
        state.activeTabUid = uid;
      }
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
    updateRequestBodyScrollPosition: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.requestBodyScrollPosition = action.payload.scrollY;
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
    updateResponseFilter: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responseFilter = action.payload.responseFilter;
      }
    },
    updateResponseFilterExpanded: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.responseFilterExpanded = action.payload.responseFilterExpanded;
      }
    },
    updateDocsEditing: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.docsEditing = action.payload.docsEditing;
      }
    },
    updateGqlDocsOpen: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.gqlDocsOpen = action.payload.gqlDocsOpen;
      }
    },
    updateTableColumnWidths: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        if (!tab.tableColumnWidths) {
          tab.tableColumnWidths = {};
        }
        tab.tableColumnWidths[action.payload.tableId] = action.payload.widths;
      }
    },
    updateScriptPaneTab: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.scriptPaneTab = action.payload.scriptPaneTab;
      }
    },
    updateQueryBuilderOpen: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.queryBuilderOpen = action.payload.queryBuilderOpen;
      }
    },
    updateQueryBuilderWidth: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.queryBuilderWidth = action.payload.queryBuilderWidth;
      }
    },
    updateVariablesPaneOpen: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.variablesPaneOpen = action.payload.variablesPaneOpen;
      }
    },
    updateVariablesPaneHeight: (state, action) => {
      const tab = find(state.tabs, (t) => t.uid === action.payload.uid);

      if (tab) {
        tab.variablesPaneHeight = action.payload.variablesPaneHeight;
      }
    },
    closeTabs: (state, action) => {
      const activeTab = find(state.tabs, (t) => t.uid === state.activeTabUid);
      const tabUids = action.payload.tabUids || [];

      const nonClosableTypes = ['workspaceOverview', 'workspaceEnvironments'];

      // Push snapshots of closing tabs to closedTabs history (LIFO stack)
      const closingTabs = state.tabs.filter(
        (t) => tabUids.includes(t.uid) && !nonClosableTypes.includes(t.type)
      );
      if (closingTabs.length > 0) {
        const collectionUid = closingTabs[0].collectionUid;
        state.lastActiveCollectionUid = collectionUid;
        closingTabs.forEach((t) => {
          state.closedTabs.push({
            uid: t.uid,
            collectionUid: t.collectionUid,
            type: t.type,
            requestPaneTab: t.requestPaneTab,
            ...(t.exampleUid ? { exampleUid: t.exampleUid } : {}),
            ...(t.itemUid ? { itemUid: t.itemUid } : {})
          });
        });
        // Cap at 50 entries per collection
        const collectionEntries = state.closedTabs.filter((t) => t.collectionUid === collectionUid);
        if (collectionEntries.length > 50) {
          const excess = collectionEntries.length - 50;
          let removed = 0;
          state.closedTabs = state.closedTabs.filter((t) => {
            if (t.collectionUid === collectionUid && removed < excess) {
              removed++;
              return false;
            }
            return true;
          });
        }
      }

      state.tabs = filter(state.tabs, (t) =>
        !tabUids.includes(t.uid) || nonClosableTypes.includes(t.type)
      );

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
      const { collectionUid } = action.payload;
      const prevActiveTabUid = state.activeTabUid;
      const nonClosableTypes = ['workspaceOverview', 'workspaceEnvironments'];

      // Push snapshots of all closing collection tabs to closedTabs history
      const closingTabs = state.tabs.filter(
        (t) => t.collectionUid === collectionUid && !nonClosableTypes.includes(t.type)
      );
      if (closingTabs.length > 0) {
        state.lastActiveCollectionUid = collectionUid;
        closingTabs.forEach((t) => {
          state.closedTabs.push({
            uid: t.uid,
            collectionUid: t.collectionUid,
            type: t.type,
            requestPaneTab: t.requestPaneTab,
            ...(t.exampleUid ? { exampleUid: t.exampleUid } : {}),
            ...(t.itemUid ? { itemUid: t.itemUid } : {})
          });
        });
        // Cap at 50 entries per collection
        const collectionEntries = state.closedTabs.filter((t) => t.collectionUid === collectionUid);
        if (collectionEntries.length > 50) {
          const excess = collectionEntries.length - 50;
          let removed = 0;
          state.closedTabs = state.closedTabs.filter((t) => {
            if (t.collectionUid === collectionUid && removed < excess) {
              removed++;
              return false;
            }
            return true;
          });
        }
      }

      state.tabs = filter(state.tabs, (t) => t.collectionUid !== collectionUid);

      const activeTabStillExists = state.tabs.some((t) => t.uid === prevActiveTabUid);
      if (!activeTabStillExists) {
        state.activeTabUid = state.tabs.length > 0 ? last(state.tabs).uid : null;
      }
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
    requestCloseConfirmation: (state, action) => {
      const { uid } = action.payload;
      const tab = find(state.tabs, (t) => t.uid === uid);
      if (tab) {
        tab.showCloseConfirmation = true;
      }
    },
    clearCloseConfirmation: (state, action) => {
      const { uid } = action.payload;
      const tab = find(state.tabs, (t) => t.uid === uid);
      if (tab) {
        tab.showCloseConfirmation = false;
      }
    },
    requestCloseAllConfirmation: (state, action) => {
      state.showCloseAllConfirmation = true;
      state.closeAllCollectionUid = action.payload?.collectionUid || null;
    },
    clearCloseAllConfirmation: (state, action) => {
      state.showCloseAllConfirmation = false;
      state.closeAllCollectionUid = null;
    },
    removeFromClosedTabs: (state, action) => {
      const { uid, collectionUid } = action.payload;
      // Remove the last matching entry (most recently added = LIFO)
      const idx = state.closedTabs.reduceRight((found, t, i) => {
        if (found !== -1) return found;
        return t.uid === uid && t.collectionUid === collectionUid ? i : -1;
      }, -1);
      if (idx !== -1) {
        state.closedTabs.splice(idx, 1);
      }
    },
    clearClosedTabsForCollection: (state, action) => {
      const { collectionUid } = action.payload;
      state.closedTabs = state.closedTabs.filter((t) => t.collectionUid !== collectionUid);
      if (state.lastActiveCollectionUid === collectionUid) {
        state.lastActiveCollectionUid = null;
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
  updateRequestBodyScrollPosition,
  updateResponseFormat,
  updateResponseViewTab,
  updateResponseFilter,
  updateResponseFilterExpanded,
  updateDocsEditing,
  updateGqlDocsOpen,
  updateTableColumnWidths,
  updateScriptPaneTab,
  closeTabs,
  closeAllCollectionTabs,
  makeTabPermanent,
  reorderTabs,
  requestCloseConfirmation,
  clearCloseConfirmation,
  requestCloseAllConfirmation,
  clearCloseAllConfirmation,
  removeFromClosedTabs,
  clearClosedTabsForCollection
  updateQueryBuilderOpen,
  updateQueryBuilderWidth,
  updateVariablesPaneOpen,
  updateVariablesPaneHeight
} = tabsSlice.actions;

export default tabsSlice.reducer;
