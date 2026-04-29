import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 500;

const initialState = {
  // Per-collection server state: { [collectionUid]: ServerState }
  servers: {},
  // Per-collection request logs: { [collectionUid]: RequestLogEntry[] }
  requestLogs: {},
  // Per-collection route tables: { [collectionUid]: Route[] }
  routes: {}
};

// Async thunks for IPC calls
export const startMockServer = createAsyncThunk(
  'mockServer/start',
  async ({ collectionUid, collectionPath, port, globalDelay }, { dispatch }) => {
    dispatch(updateServerStatus({
      collectionUid,
      status: 'starting',
      port,
      error: null,
      routeCount: 0,
      exampleCount: 0,
      globalDelay: globalDelay || 0
    }));

    const result = await window.ipcRenderer.invoke('renderer:mock-server-start', {
      collectionUid,
      collectionPath,
      port: Number(port),
      globalDelay: Number(globalDelay) || 0
    });

    if (!result.success) {
      dispatch(updateServerStatus({
        collectionUid,
        status: 'error',
        port: null,
        error: result.error,
        routeCount: 0,
        exampleCount: 0,
        globalDelay: 0
      }));
      throw new Error(result.error);
    }

    // Fetch routes after start
    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', { collectionUid });
    dispatch(setRouteTable({ collectionUid, routes }));

    return result;
  }
);

export const stopMockServer = createAsyncThunk(
  'mockServer/stop',
  async ({ collectionUid }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-stop', { collectionUid });
    if (!result.success) {
      throw new Error(result.error);
    }
    return { collectionUid };
  }
);

export const refreshMockRoutes = createAsyncThunk(
  'mockServer/refreshRoutes',
  async ({ collectionUid }, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-refresh-routes', { collectionUid });
    if (!result.success) {
      throw new Error(result.error);
    }

    // Fetch updated routes
    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', { collectionUid });
    dispatch(setRouteTable({ collectionUid, routes }));

    return result;
  }
);

export const updateMockDelay = createAsyncThunk(
  'mockServer/updateDelay',
  async ({ collectionUid, delay }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-set-delay', {
      collectionUid,
      delay: Number(delay) || 0
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    return { collectionUid, delay: Number(delay) || 0 };
  }
);

export const clearMockLog = createAsyncThunk(
  'mockServer/clearLog',
  async ({ collectionUid }) => {
    await window.ipcRenderer.invoke('renderer:mock-server-clear-log', { collectionUid });
    return { collectionUid };
  }
);

export const mockServerSlice = createSlice({
  name: 'mockServer',
  initialState,
  reducers: {
    updateServerStatus: (state, action) => {
      const { collectionUid, ...status } = action.payload;
      state.servers[collectionUid] = {
        ...(state.servers[collectionUid] || {}),
        ...status
      };
    },

    addRequestLogEntry: (state, action) => {
      const { collectionUid, entry } = action.payload;
      if (!state.requestLogs[collectionUid]) {
        state.requestLogs[collectionUid] = [];
      }
      state.requestLogs[collectionUid].push(entry);
      // Trim to max entries
      if (state.requestLogs[collectionUid].length > MAX_LOG_ENTRIES) {
        state.requestLogs[collectionUid] = state.requestLogs[collectionUid].slice(-MAX_LOG_ENTRIES);
      }
    },

    clearRequestLog: (state, action) => {
      const { collectionUid } = action.payload;
      state.requestLogs[collectionUid] = [];
    },

    setRouteTable: (state, action) => {
      const { collectionUid, routes } = action.payload;
      state.routes[collectionUid] = routes;
    }
  },

  extraReducers: (builder) => {
    builder
      .addCase(stopMockServer.fulfilled, (state, action) => {
        const { collectionUid } = action.payload;
        state.servers[collectionUid] = {
          status: 'stopped',
          port: null,
          error: null,
          routeCount: 0,
          exampleCount: 0,
          globalDelay: 0
        };
        state.requestLogs[collectionUid] = [];
        state.routes[collectionUid] = [];
      })
      .addCase(updateMockDelay.fulfilled, (state, action) => {
        const { collectionUid, delay } = action.payload;
        if (state.servers[collectionUid]) {
          state.servers[collectionUid].globalDelay = delay;
        }
      })
      .addCase(clearMockLog.fulfilled, (state, action) => {
        const { collectionUid } = action.payload;
        state.requestLogs[collectionUid] = [];
      });
  }
});

export const {
  updateServerStatus,
  addRequestLogEntry,
  clearRequestLog,
  setRouteTable
} = mockServerSlice.actions;

export default mockServerSlice.reducer;
