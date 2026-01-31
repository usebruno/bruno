import { createSlice } from '@reduxjs/toolkit';
import filter from 'lodash/filter';
import find from 'lodash/find';
import last from 'lodash/last';

const initialState = {
  tabs: [],
  activeTabUid: null
};

export const workspaceTabsSlice = createSlice({
  name: 'workspaceTabs',
  initialState,
  reducers: {
    addWorkspaceTab: (state, action) => {
      const { uid, workspaceUid, type, label, permanent = false } = action.payload;

      const existingTab = find(state.tabs, (tab) => tab.uid === uid);
      if (existingTab) {
        state.activeTabUid = existingTab.uid;
        return;
      }

      // Check if a tab of the same type already exists for this workspace
      const existingTypeTab = find(
        state.tabs,
        (tab) => tab.workspaceUid === workspaceUid && tab.type === type
      );
      if (existingTypeTab) {
        state.activeTabUid = existingTypeTab.uid;
        return;
      }

      state.tabs.push({
        uid,
        workspaceUid,
        type,
        label,
        permanent
      });
      state.activeTabUid = uid;
    },
    focusWorkspaceTab: (state, action) => {
      state.activeTabUid = action.payload.uid;
    },
    closeWorkspaceTab: (state, action) => {
      const tabUid = action.payload.uid;
      const tab = find(state.tabs, (t) => t.uid === tabUid);

      // Don't allow closing permanent tabs
      if (tab?.permanent) {
        return;
      }

      state.tabs = filter(state.tabs, (t) => t.uid !== tabUid);

      // If we closed the active tab, activate another one
      if (state.activeTabUid === tabUid && state.tabs.length > 0) {
        state.activeTabUid = last(state.tabs).uid;
      } else if (state.tabs.length === 0) {
        state.activeTabUid = null;
      }
    },
    closeWorkspaceTabs: (state, action) => {
      const tabUids = action.payload.tabUids || [];

      // Filter out permanent tabs from the close request
      const tabsToClose = tabUids.filter((uid) => {
        const tab = find(state.tabs, (t) => t.uid === uid);
        return tab && !tab.permanent;
      });

      state.tabs = filter(state.tabs, (t) => !tabsToClose.includes(t.uid));

      // If active tab was closed, activate another one
      if (tabsToClose.includes(state.activeTabUid)) {
        if (state.tabs.length > 0) {
          state.activeTabUid = last(state.tabs).uid;
        } else {
          state.activeTabUid = null;
        }
      }
    },
    closeAllWorkspaceTabs: (state, action) => {
      const workspaceUid = action.payload?.workspaceUid;

      if (workspaceUid) {
        // Close non-permanent tabs for specific workspace
        state.tabs = filter(
          state.tabs,
          (t) => t.workspaceUid !== workspaceUid || t.permanent
        );
      } else {
        // Close all non-permanent tabs
        state.tabs = filter(state.tabs, (t) => t.permanent);
      }

      // If active tab was closed, activate another one
      const activeTabExists = find(state.tabs, (t) => t.uid === state.activeTabUid);
      if (!activeTabExists) {
        state.activeTabUid = state.tabs.length > 0 ? last(state.tabs).uid : null;
      }
    },
    reorderWorkspaceTabs: (state, action) => {
      const { sourceUid, targetUid } = action.payload;
      const tabs = state.tabs;

      const sourceIdx = tabs.findIndex((t) => t.uid === sourceUid);
      const targetIdx = tabs.findIndex((t) => t.uid === targetUid);

      // Don't reorder permanent tabs
      const sourceTab = tabs[sourceIdx];
      if (sourceTab?.permanent) {
        return;
      }

      if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) {
        return;
      }

      const [moved] = tabs.splice(sourceIdx, 1);
      tabs.splice(targetIdx, 0, moved);

      state.tabs = tabs;
    },
    initializeWorkspaceTabs: (state, action) => {
      const { workspaceUid, permanentTabs } = action.payload;

      // Check if permanent tabs already exist for this workspace
      const existingPermanentTabs = state.tabs.filter(
        (t) => t.workspaceUid === workspaceUid && t.permanent
      );

      if (existingPermanentTabs.length === 0) {
        // Add permanent tabs
        permanentTabs.forEach((tab) => {
          state.tabs.push({
            uid: `${workspaceUid}-${tab.type}`,
            workspaceUid,
            type: tab.type,
            label: tab.label,
            permanent: true
          });
        });
      }

      const workspaceActiveTab = state.tabs.find(
        (t) => t.uid === state.activeTabUid && t.workspaceUid === workspaceUid
      );

      if (!workspaceActiveTab) {
        const workspaceTabs = state.tabs.filter((t) => t.workspaceUid === workspaceUid);
        if (workspaceTabs.length > 0) {
          state.activeTabUid = workspaceTabs[0].uid;
        }
      }
    },
    setActiveWorkspaceTab: (state, action) => {
      const { workspaceUid, type } = action.payload;
      let tab = find(
        state.tabs,
        (t) => t.workspaceUid === workspaceUid && t.type === type
      );

      if (!tab) {
        const newTabUid = `${workspaceUid}-${type}`;
        const labels = {
          overview: 'Overview',
          environments: 'Global Environments',
          preferences: 'Preferences'
        };
        const newTab = {
          uid: newTabUid,
          workspaceUid,
          type,
          label: labels[type] || type,
          permanent: false
        };
        state.tabs.push(newTab);
        tab = newTab;
      }

      state.activeTabUid = tab.uid;
    }
  }
});

export const {
  addWorkspaceTab,
  focusWorkspaceTab,
  closeWorkspaceTab,
  closeWorkspaceTabs,
  closeAllWorkspaceTabs,
  reorderWorkspaceTabs,
  initializeWorkspaceTabs,
  setActiveWorkspaceTab
} = workspaceTabsSlice.actions;

export default workspaceTabsSlice.reducer;
