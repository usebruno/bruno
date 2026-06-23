import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 500;

const initialState = {
  // Per-instance server state: { [mockServerUid]: ServerState }
  servers: {},
  // Per-instance request logs: { [mockServerUid]: RequestLogEntry[] }
  requestLogs: {},
  // Per-instance route tables: { [mockServerUid]: Route[] }
  routes: {},
  // Per-instance mock responses: { [mockServerUid]: MockResponse[] }
  mockResponses: {}
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

    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', payload);
    dispatch(setRouteTable({ mockServerUid, routes: routes || [] }));

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
    const result = await window.ipcRenderer.invoke('renderer:mock-server-refresh-routes', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    const routes = result.routes || await window.ipcRenderer.invoke('renderer:mock-server-get-routes', payload);
    dispatch(setRouteTable({ mockServerUid, routes: routes || [] }));

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
    const result = await window.ipcRenderer.invoke('renderer:mock-server-sync-state', payload);

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

export const loadMockServerRoutes = createAsyncThunk(
  'mockServer/loadRoutes',
  async (payload, { dispatch }) => {
    const mockServerUid = resolveMockServerUid(payload);
    const routes = await window.ipcRenderer.invoke('renderer:mock-server-get-routes', payload);
    dispatch(setRouteTable({ mockServerUid, routes: routes || [] }));

    return {
      mockServerUid,
      routes: routes || []
    };
  }
);

export const loadMockResponses = createAsyncThunk(
  'mockServer/loadResponses',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-get-responses', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    await dispatch(loadMockServerRoutes(payload));

    return {
      mockServerUid: payload.mockServerUid,
      responses: result.responses || []
    };
  }
);

export const createMockResponse = createAsyncThunk(
  'mockServer/createResponse',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-create-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    await dispatch(loadMockResponses(payload));
    await dispatch(syncMockServerState({ mockServerUid: payload.mockServerUid }));

    return {
      mockServerUid: payload.mockServerUid,
      response: result.response
    };
  }
);

export const saveMockResponse = createAsyncThunk(
  'mockServer/saveResponse',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-save-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    await dispatch(loadMockResponses(payload));
    await dispatch(syncMockServerState({ mockServerUid: payload.mockServerUid }));

    return {
      mockServerUid: payload.mockServerUid,
      response: result.response
    };
  }
);

export const deleteMockResponse = createAsyncThunk(
  'mockServer/deleteResponse',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-delete-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    await dispatch(loadMockResponses(payload));
    await dispatch(syncMockServerState({ mockServerUid: payload.mockServerUid }));

    return {
      mockServerUid: payload.mockServerUid,
      responseUid: payload.responseUid
    };
  }
);

export const generateMockResponsesFromSpec = createAsyncThunk(
  'mockServer/generateFromSpec',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-generate-from-spec', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    await dispatch(loadMockResponses(payload));
    await dispatch(syncMockServerState({ mockServerUid: payload.mockServerUid }));

    return {
      mockServerUid: payload.mockServerUid,
      createdCount: result.createdCount || 0,
      responses: result.responses || []
    };
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
    },

    setMockResponses: (state, action) => {
      const { mockServerUid, responses } = action.payload;
      state.mockResponses[mockServerUid] = responses || [];
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
      })
      .addCase(loadMockResponses.fulfilled, (state, action) => {
        const { mockServerUid, responses } = action.payload;
        state.mockResponses[mockServerUid] = responses;
      })
      .addCase(createMockResponse.fulfilled, (state, action) => {
        const { mockServerUid, response } = action.payload;
        if (!state.mockResponses[mockServerUid]) {
          state.mockResponses[mockServerUid] = [];
        }

        const existingIndex = state.mockResponses[mockServerUid].findIndex((item) => item.uid === response.uid);
        if (existingIndex >= 0) {
          state.mockResponses[mockServerUid][existingIndex] = response;
        } else {
          state.mockResponses[mockServerUid].push(response);
        }
      })
      .addCase(saveMockResponse.fulfilled, (state, action) => {
        const { mockServerUid, response } = action.payload;
        if (!state.mockResponses[mockServerUid]) {
          state.mockResponses[mockServerUid] = [];
        }

        const existingIndex = state.mockResponses[mockServerUid].findIndex((item) => item.uid === response.uid);
        if (existingIndex >= 0) {
          state.mockResponses[mockServerUid][existingIndex] = response;
        } else {
          state.mockResponses[mockServerUid].push(response);
        }
      })
      .addCase(deleteMockResponse.fulfilled, (state, action) => {
        const { mockServerUid, responseUid } = action.payload;
        state.mockResponses[mockServerUid] = (state.mockResponses[mockServerUid] || [])
          .filter((response) => response.uid !== responseUid);
      })
      .addCase(generateMockResponsesFromSpec.fulfilled, (state, action) => {
        const { mockServerUid } = action.payload;
        // Responses are reloaded via loadMockResponses in the thunk.
        if (!state.mockResponses[mockServerUid]) {
          state.mockResponses[mockServerUid] = [];
        }
      });
  }
});

export const {
  updateServerStatus,
  addRequestLogEntry,
  clearRequestLog,
  setRouteTable,
  setRequestLogs,
  setMockResponses
} = mockServerSlice.actions;

export default mockServerSlice.reducer;
