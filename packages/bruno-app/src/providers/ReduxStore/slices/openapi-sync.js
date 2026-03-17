import { createSlice } from '@reduxjs/toolkit';
import { normalizePath } from 'utils/common/path';

const initialState = {
  // Map of collectionUid -> { hasUpdates, diff, lastChecked, error }
  collectionUpdates: {},
  // Whether App level OpenAPI polling is enabled
  pollingEnabled: true,
  // Last poll timestamp
  lastPollTime: null,
  // Map of collectionUid -> { activeTab, expandedSections, expandedRows }
  tabUiState: {},
  // Map of collectionUid -> { title, version, endpointCount } (persists across tab navigations)
  storedSpecMeta: {}
};

export const openapiSyncSlice = createSlice({
  name: 'openapiSync',
  initialState,
  reducers: {
    setCollectionUpdate: (state, action) => {
      const { collectionUid, hasUpdates, diff, error } = action.payload;
      state.collectionUpdates[collectionUid] = {
        hasUpdates,
        diff,
        error,
        lastChecked: Date.now()
      };
    },
    clearCollectionUpdate: (state, action) => {
      const { collectionUid } = action.payload;
      delete state.collectionUpdates[collectionUid];
    },
    clearCollectionState: (state, action) => {
      const { collectionUid } = action.payload;
      delete state.collectionUpdates[collectionUid];
      delete state.tabUiState[collectionUid];
      delete state.storedSpecMeta[collectionUid];
    },
    setStoredSpecMeta: (state, action) => {
      const { collectionUid, title, version, endpointCount } = action.payload;
      state.storedSpecMeta[collectionUid] = { title, version, endpointCount };
    },
    setPollingEnabled: (state, action) => {
      state.pollingEnabled = action.payload;
    },
    setLastPollTime: (state, action) => {
      state.lastPollTime = action.payload;
    },
    // UI state reducers
    setTabUiState: (state, action) => {
      const { collectionUid, ...uiState } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      Object.assign(state.tabUiState[collectionUid], uiState);
    },
    toggleSectionExpanded: (state, action) => {
      const { collectionUid, sectionKey } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      if (!state.tabUiState[collectionUid].expandedSections) {
        state.tabUiState[collectionUid].expandedSections = {};
      }
      const current = state.tabUiState[collectionUid].expandedSections[sectionKey];
      state.tabUiState[collectionUid].expandedSections[sectionKey] = !current;
    },
    setSectionExpanded: (state, action) => {
      const { collectionUid, sectionKey, expanded } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      if (!state.tabUiState[collectionUid].expandedSections) {
        state.tabUiState[collectionUid].expandedSections = {};
      }
      state.tabUiState[collectionUid].expandedSections[sectionKey] = expanded;
    },
    toggleRowExpanded: (state, action) => {
      const { collectionUid, rowKey } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      if (!state.tabUiState[collectionUid].expandedRows) {
        state.tabUiState[collectionUid].expandedRows = {};
      }
      const current = state.tabUiState[collectionUid].expandedRows[rowKey];
      state.tabUiState[collectionUid].expandedRows[rowKey] = !current;
    },
    setReviewDecision: (state, action) => {
      const { collectionUid, endpointId, decision } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      if (!state.tabUiState[collectionUid].reviewDecisions) {
        state.tabUiState[collectionUid].reviewDecisions = {};
      }
      state.tabUiState[collectionUid].reviewDecisions[endpointId] = decision;
    },
    setReviewDecisions: (state, action) => {
      const { collectionUid, decisions } = action.payload;
      if (!state.tabUiState[collectionUid]) {
        state.tabUiState[collectionUid] = {};
      }
      // Merge into existing decisions instead of replacing, so decisions
      // for other change types (e.g., specChanges) are preserved
      state.tabUiState[collectionUid].reviewDecisions = {
        ...state.tabUiState[collectionUid].reviewDecisions,
        ...decisions
      };
    }
  }
});

export const {
  setCollectionUpdate,
  clearCollectionUpdate,
  clearCollectionState,
  setPollingEnabled,
  setTabUiState,
  toggleSectionExpanded,
  setSectionExpanded,
  toggleRowExpanded,
  setLastPollTime,
  setReviewDecision,
  setReviewDecisions,
  setStoredSpecMeta
} = openapiSyncSlice.actions;

// Lightweight thunk for polling — only checks hash, no deep comparison
export const checkCollectionForUpdates = (collection) => async (dispatch) => {
  if (!collection?.brunoConfig?.openapi?.[0]?.sourceUrl) {
    return null;
  }

  try {
    const { ipcRenderer } = window;
    const syncConfig = collection.brunoConfig.openapi[0];
    const result = await ipcRenderer.invoke('renderer:check-openapi-updates', {
      collectionUid: collection.uid,
      collectionPath: collection.pathname,
      sourceUrl: syncConfig.sourceUrl,
      storedSpecHash: syncConfig.specHash || null,
      environmentContext: {
        activeEnvironmentUid: collection.activeEnvironmentUid,
        environments: collection.environments,
        runtimeVariables: collection.runtimeVariables,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      }
    });

    dispatch(setCollectionUpdate({
      collectionUid: collection.uid,
      hasUpdates: result.hasUpdates || false,
      diff: null,
      error: result.error || null
    }));

    return result;
  } catch (error) {
    console.error('[OpenAPI Sync] Error checking for updates:', error);
    dispatch(setCollectionUpdate({
      collectionUid: collection.uid,
      hasUpdates: false,
      diff: null,
      error: error.message
    }));
    return null;
  }
};

// Thunk to check active workspace collections for updates (respects per-collection autoCheck and autoCheckInterval)
export const checkActiveWorkspaceCollectionsForUpdates = () => async (dispatch, getState) => {
  const state = getState();
  const collections = state.collections?.collections || [];
  const { workspaces, activeWorkspaceUid } = state.workspaces;
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const now = Date.now();

  // Filter to active workspace collections that have OpenAPI sync configured and auto-check enabled
  const syncableCollections = collections.filter((c) => {
    if (!activeWorkspace?.collections?.some((wc) => normalizePath(wc.path) === normalizePath(c.pathname))) {
      return false;
    }
    const syncConfig = c.brunoConfig?.openapi?.[0];
    if (!syncConfig?.sourceUrl) return false;
    if (syncConfig.autoCheck === false) return false;
    return true;
  });

  for (const collection of syncableCollections) {
    const syncConfig = collection.brunoConfig.openapi[0];
    const intervalMs = (syncConfig.autoCheckInterval || 5) * 60 * 1000;
    const lastChecked = state.openapiSync?.collectionUpdates?.[collection.uid]?.lastChecked || 0;

    // Only check if enough time has elapsed since last check for this collection
    if (now - lastChecked >= intervalMs) {
      await dispatch(checkCollectionForUpdates(collection));
    }
  }

  dispatch(setLastPollTime(Date.now()));
};

// Selector to get UI state for a specific collection's sync tab
export const selectTabUiState = (collectionUid) => (state) => {
  return state.openapiSync?.tabUiState?.[collectionUid] || {};
};

// Selector for stored spec metadata (title, version, endpointCount)
export const selectStoredSpecMeta = (collectionUid) => (state) => {
  return state.openapiSync?.storedSpecMeta?.[collectionUid] || null;
};

export default openapiSyncSlice.reducer;
