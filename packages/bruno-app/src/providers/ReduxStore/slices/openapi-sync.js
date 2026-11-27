import { createSlice } from '@reduxjs/toolkit';
import { getWorkspaceCollections } from 'utils/collections';
import { callIpc } from 'utils/common/ipc';

const initialState = {
  // Map of collectionUid -> { hasUpdates, lastChecked, error }
  // Lightweight indicator state for the toolbar status badge — fed by
  // background polling. Full drift data lives in `drift` (this slice).
  collectionUpdates: {},
  // Whether App level OpenAPI polling is enabled
  pollingEnabled: true,
  // Last poll timestamp
  lastPollTime: null,
  // Map of collectionUid -> { activeTab, expandedSections, expandedRows }
  tabUiState: {},
  // Map of collectionUid -> { title, version, endpointCount }
  storedSpecMeta: {},
  // Map of collectionUid -> full parsed OpenAPI spec object
  storedSpec: {},
  // Map of collectionUid -> { specDrift, collectionDrift, remoteDrift, fetching, lastChecked }
  drift: {},
  // Map of collectionUid -> { status, source, kind, isLocalOrPrivate, autoCheck, autoCheckInterval }
  sourceStates: {}
};

export const openapiSyncSlice = createSlice({
  name: 'openapiSync',
  initialState,
  reducers: {
    setCollectionUpdate: (state, action) => {
      const { collectionUid, hasUpdates, error } = action.payload;
      state.collectionUpdates[collectionUid] = {
        hasUpdates,
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
      delete state.storedSpec[collectionUid];
      delete state.drift[collectionUid];
      delete state.sourceStates[collectionUid];
    },
    setSourceState: (state, action) => {
      const { collectionUid, sourceState } = action.payload;
      state.sourceStates[collectionUid] = sourceState;
    },
    setDrift: (state, action) => {
      const { collectionUid, patch } = action.payload;
      state.drift[collectionUid] = { ...state.drift[collectionUid], ...patch };
    },
    clearDrift: (state, action) => {
      const { collectionUid } = action.payload;
      delete state.drift[collectionUid];
    },
    clearOpenApiSyncTabState: (state, action) => {
      const { collectionUid } = action.payload;
      delete state.drift[collectionUid];
      delete state.storedSpec[collectionUid];
      delete state.tabUiState[collectionUid];
    },
    setStoredSpec: (state, action) => {
      const { collectionUid, spec } = action.payload;
      if (spec === null || spec === undefined) {
        delete state.storedSpec[collectionUid];
      } else {
        state.storedSpec[collectionUid] = spec;
      }
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
  setStoredSpec,
  setStoredSpecMeta,
  setDrift,
  clearDrift,
  clearOpenApiSyncTabState,
  setSourceState
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
      error: result.error || null
    }));

    return result;
  } catch (error) {
    console.error('[OpenAPI Sync] Error checking for updates:', error);
    dispatch(setCollectionUpdate({
      collectionUid: collection.uid,
      hasUpdates: false,
      error: error.message
    }));
    return null;
  }
};

const updateSourceState = (collection, channel, request = {}) => async (dispatch) => {
  const sourceState = await callIpc(channel, { collectionPath: collection.pathname, ...request });
  dispatch(setSourceState({ collectionUid: collection.uid, sourceState }));
  return sourceState;
};

export const loadSyncSourceState = (collection) => async (dispatch, getState) => {
  try {
    return await dispatch(updateSourceState(collection, 'renderer:get-openapi-sync-source-state'));
  } catch (error) {
    console.error('[OpenAPI Sync] Error reading the sync source state:', error);
    // Keep a state read earlier; only a first read that fails needs a retry in the tab.
    if (!getState().openapiSync?.sourceStates?.[collection.uid]) {
      dispatch(setSourceState({ collectionUid: collection.uid, sourceState: { status: 'error' } }));
    }
    return null;
  }
};

export const approveSyncSource = (collection, { autoCheck, autoCheckInterval, sourceUrl, expectedSource } = {}) => async (dispatch, getState) => {
  const previous = getState().openapiSync?.sourceStates?.[collection.uid];
  const sourceState = await dispatch(updateSourceState(collection, 'renderer:approve-openapi-sync-source', { autoCheck, autoCheckInterval, sourceUrl, expectedSource }));
  // Results from the last check belong to the previous source, so they must not show for this one.
  // Settings approves a new URL before saving it, so the returned state can still describe the old, now unapproved, source.
  if (previous?.status !== 'approved' || sourceState?.status !== 'approved' || previous.source !== sourceState.source) {
    dispatch(clearCollectionUpdate({ collectionUid: collection.uid }));
    dispatch(clearDrift({ collectionUid: collection.uid }));
  }
  return sourceState;
};

export const dismissSyncSource = (collection, { expectedSource } = {}) =>
  updateSourceState(collection, 'renderer:dismiss-openapi-sync-source', { expectedSource });

// Thunk to check active workspace collections for updates (approved sources only, settings from app data)
export const checkActiveWorkspaceCollectionsForUpdates = () => async (dispatch, getState) => {
  const state = getState();
  const collections = state.collections?.collections || [];
  const { workspaces, activeWorkspaceUid } = state.workspaces;
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const now = Date.now();

  const linkedCollections = getWorkspaceCollections({ collections, workspaces, activeWorkspace })
    .filter((c) => c.brunoConfig?.openapi?.[0]?.sourceUrl);

  for (const collection of linkedCollections) {
    const sourceState = await dispatch(loadSyncSourceState(collection));
    if (sourceState?.status !== 'approved' || !sourceState.autoCheck) continue;

    const intervalMs = sourceState.autoCheckInterval * 60 * 1000;
    const lastChecked = getState().openapiSync?.collectionUpdates?.[collection.uid]?.lastChecked || 0;

    // Only check if enough time has elapsed since last check for this collection
    if (now - lastChecked >= intervalMs) {
      await dispatch(checkCollectionForUpdates(collection));
    }
  }

  dispatch(setLastPollTime(Date.now()));
};

export default openapiSyncSlice.reducer;
