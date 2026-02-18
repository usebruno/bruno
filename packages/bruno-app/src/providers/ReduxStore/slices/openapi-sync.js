import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Map of collectionUid -> { hasUpdates, diff, lastChecked, error }
  collectionUpdates: {},
  // Whether polling is enabled
  pollingEnabled: true,
  // Last poll timestamp
  lastPollTime: null,
  // Map of collectionUid -> { activeTab, viewMode, expandedSections, expandedRows }
  tabUiState: {}
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
    },
    clearAllUpdates: (state) => {
      state.collectionUpdates = {};
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
  clearAllUpdates,
  setPollingEnabled,
  setLastPollTime,
  setTabUiState,
  toggleSectionExpanded,
  setSectionExpanded,
  toggleRowExpanded,
  setReviewDecision,
  setReviewDecisions
} = openapiSyncSlice.actions;

// Lightweight thunk for polling — only checks hash, no deep comparison
export const checkCollectionForUpdates = (collection) => async (dispatch) => {
  if (!collection?.brunoConfig?.openapi?.sync?.sourceUrl) {
    return null;
  }

  try {
    const { ipcRenderer } = window;
    const syncConfig = collection.brunoConfig.openapi.sync;
    const result = await ipcRenderer.invoke('renderer:check-openapi-updates', {
      sourceUrl: syncConfig.sourceUrl,
      storedSpecHash: syncConfig.specHash || null
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

// Thunk to check all collections for updates
export const checkAllCollectionsForUpdates = () => async (dispatch, getState) => {
  const state = getState();
  const collections = state.collections?.collections || [];

  // Filter collections that have OpenAPI sync configured
  const syncableCollections = collections.filter(
    (c) => c.brunoConfig?.openapi?.sync?.sourceUrl
  );

  for (const collection of syncableCollections) {
    await dispatch(checkCollectionForUpdates(collection));
  }

  dispatch(setLastPollTime(Date.now()));
};

// Selector to get collections with available updates
export const selectCollectionsWithUpdates = (state) => {
  const updates = state.openapiSync?.collectionUpdates || {};
  return Object.entries(updates)
    .filter(([_, update]) => update.hasUpdates)
    .map(([collectionUid, update]) => ({
      collectionUid,
      ...update
    }));
};

// Selector to get update count
export const selectUpdateCount = (state) => {
  const updates = state.openapiSync?.collectionUpdates || {};
  return Object.values(updates).filter((u) => u.hasUpdates).length;
};

// Selector to check if a specific collection has updates
export const selectCollectionHasUpdates = (collectionUid) => (state) => {
  return state.openapiSync?.collectionUpdates?.[collectionUid]?.hasUpdates || false;
};

// Selector to get UI state for a specific collection's sync tab
export const selectTabUiState = (collectionUid) => (state) => {
  return state.openapiSync?.tabUiState?.[collectionUid] || {};
};

export default openapiSyncSlice.reducer;
