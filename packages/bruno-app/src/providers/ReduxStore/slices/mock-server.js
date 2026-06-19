import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 500;

const initialState = {
  // Per-instance server state: { [mockServerUid]: ServerState }
  servers: {},
  // Per-instance request logs: { [mockServerUid]: RequestLogEntry[] }
  requestLogs: {},
  // Per-instance route tables: { [mockServerUid]: Route[] }
  routes: {}
};

const resolveMockServerUid = (payload) => payload.mockServerUid || payload.collectionUid;

// Async thunks for IPC calls
export const startMockServer = createAsyncThunk(
  'mockServer/start',
  async (payload, { dispatch }) => {
    const mockServerUid = resolveMockServerUid(payload);
    const { port, globalDelay } = payload;

    dispatch(updateServerStatus({
      mockServerUid,
      status: 'starting',
      port,
      error: null,
      routeCount: 0,
      exampleCount: 0,
      globalDelay: globalDelay || 0
    }));

    const result = await window.ipcRenderer.invoke('renderer:mock-server-start', payload);

    if (!result.success) {
      dispatch(updateServerStatus({
        mockServerUid,
        status: 'error',
        port: null,
        error: result.error,
        routeCount: 0,
        exampleCount: 0,
        globalDelay: 0
      }));
      throw new Error(result.error);
    }

    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', { mockServerUid });
    dispatch(setRouteTable({ mockServerUid, routes }));

    dispatch(updateServerStatus({
      mockServerUid,
      status: 'running',
      port: result.port,
      baseUrl: result.baseUrl,
      slug: result.slug,
      mode: result.mode,
      routeCount: result.routeCount,
      exampleCount: result.exampleCount,
      globalDelay: globalDelay || 0,
      error: null
    }));

    return result;
  }
);

export const stopMockServer = createAsyncThunk(
  'mockServer/stop',
  async (payload) => {
    const mockServerUid = resolveMockServerUid(payload);
    const result = await window.ipcRenderer.invoke('renderer:mock-server-stop', { mockServerUid });
    if (!result.success) {
      throw new Error(result.error);
    }
    return { mockServerUid };
  }
);

export const refreshMockRoutes = createAsyncThunk(
  'mockServer/refreshRoutes',
  async (payload, { dispatch }) => {
    const mockServerUid = resolveMockServerUid(payload);
    const result = await window.ipcRenderer.invoke('renderer:mock-server-refresh-routes', { mockServerUid });
    if (!result.success) {
      throw new Error(result.error);
    }

    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', { mockServerUid });
    dispatch(setRouteTable({ mockServerUid, routes }));

    return result;
  }
);

export const updateMockDelay = createAsyncThunk(
  'mockServer/updateDelay',
  async (payload) => {
    const mockServerUid = resolveMockServerUid(payload);
    const { delay } = payload;
    const result = await window.ipcRenderer.invoke('renderer:mock-server-set-delay', {
      mockServerUid,
      delay: Number(delay) || 0
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    return { mockServerUid, delay: Number(delay) || 0 };
  }
);

export const clearMockLog = createAsyncThunk(
  'mockServer/clearLog',
  async (payload) => {
    const mockServerUid = resolveMockServerUid(payload);
    await window.ipcRenderer.invoke('renderer:mock-server-clear-log', { mockServerUid });
    return { mockServerUid };
  }
);

export const syncMockServerState = createAsyncThunk(
  'mockServer/syncState',
  async (payload, { dispatch }) => {
    const mockServerUid = resolveMockServerUid(payload);
    const result = await window.ipcRenderer.invoke('renderer:mock-server-sync-state', { mockServerUid });

    dispatch(updateServerStatus({
      mockServerUid,
      ...(result?.status || {})
    }));
    dispatch(setRouteTable({ mockServerUid, routes: result?.routes || [] }));
    dispatch(setRequestLogs({ mockServerUid, entries: result?.log || [] }));

    return { mockServerUid, ...result };
  }
);

export const syncRunningMockServers = createAsyncThunk(
  'mockServer/syncRunning',
  async (_, { dispatch }) => {
    const runningUids = await window.ipcRenderer.invoke('renderer:mock-server-get-running');
    await Promise.all((runningUids || []).map((mockServerUid) => (
      dispatch(syncMockServerState({ mockServerUid })).unwrap()
    )));
    return runningUids || [];
  }
);

export const mockServerSlice = createSlice({
  name: 'mockServer',
  initialState,
  reducers: {
    updateServerStatus: (state, action) => {
      const { mockServerUid, collectionUid, ...status } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.servers[uid] = {
        ...(state.servers[uid] || {}),
        ...status
      };
    },

    addRequestLogEntry: (state, action) => {
      const { mockServerUid, collectionUid, entry } = action.payload;
      const uid = mockServerUid || collectionUid;
      if (!state.requestLogs[uid]) {
        state.requestLogs[uid] = [];
      }
      state.requestLogs[uid].push(entry);
      if (state.requestLogs[uid].length > MAX_LOG_ENTRIES) {
        state.requestLogs[uid] = state.requestLogs[uid].slice(-MAX_LOG_ENTRIES);
      }
    },

    clearRequestLog: (state, action) => {
      const { mockServerUid, collectionUid } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.requestLogs[uid] = [];
    },

    setRouteTable: (state, action) => {
      const { mockServerUid, collectionUid, routes } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.routes[uid] = routes;
    },

    setRequestLogs: (state, action) => {
      const { mockServerUid, collectionUid, entries } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.requestLogs[uid] = entries || [];
    }
  },

  extraReducers: (builder) => {
    builder
      .addCase(stopMockServer.fulfilled, (state, action) => {
        const { mockServerUid } = action.payload;
        state.servers[mockServerUid] = {
          status: 'stopped',
          port: null,
          baseUrl: null,
          slug: null,
          mode: null,
          error: null,
          routeCount: 0,
          exampleCount: 0,
          globalDelay: 0
        };
        state.requestLogs[mockServerUid] = [];
        state.routes[mockServerUid] = [];
      })
      .addCase(updateMockDelay.fulfilled, (state, action) => {
        const { mockServerUid, delay } = action.payload;
        if (state.servers[mockServerUid]) {
          state.servers[mockServerUid].globalDelay = delay;
        }
      })
      .addCase(clearMockLog.fulfilled, (state, action) => {
        const { mockServerUid } = action.payload;
        state.requestLogs[mockServerUid] = [];
      });
  }
});

export const {
  updateServerStatus,
  addRequestLogEntry,
  clearRequestLog,
  setRouteTable,
  setRequestLogs
} = mockServerSlice.actions;

export default mockServerSlice.reducer;
