import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 500;

const initialState = {
  // Per-instance server state: { [mockServerUid]: ServerState }
  servers: {},
  // Per-instance request logs: { [mockServerUid]: RequestLogEntry[] }
  requestLogs: {},
  // Per-instance route hit counts: { [mockServerUid]: { [method path]: number } }
  routeHitCounts: {},
  // Per-instance route tables: { [mockServerUid]: Route[] }
  routes: {},
  // Per-instance mock responses: { [mockServerUid]: MockResponse[] }
  mockResponses: {},
  // Workspace-scoped mock server instances from mockserver.yml
  instancesByWorkspace: {}
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

export const loadMockServerInstances = createAsyncThunk(
  'mockServer/loadInstances',
  async ({ workspacePath, workspaceUid, migrateFrom = [] }, { rejectWithValue }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-list-instances', {
      workspacePath,
      workspaceUid,
      migrateFrom
    });

    if (!result.success) {
      return rejectWithValue(result.error);
    }

    return {
      workspaceUid,
      instances: result.instances || [],
      migratedCount: migrateFrom.length
    };
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
    const result = await window.ipcRenderer.invoke('renderer:mock-server-get-responses-and-routes', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    const mockServerUid = payload.mockServerUid;
    dispatch(setRouteTable({ mockServerUid, routes: result.routes || [] }));

    return {
      mockServerUid,
      responses: result.responses || []
    };
  }
);

export const loadAllMockResponses = createAsyncThunk(
  'mockServer/loadAllResponses',
  async ({ locations }, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-load-all-responses', { locations });
    if (!result.success) {
      throw new Error(result.error);
    }

    const loaded = [];

    for (const location of locations) {
      const mockServerUid = location.mockServerUid;
      const data = result.results?.[mockServerUid];

      if (!data) {
        continue;
      }

      dispatch(setRouteTable({ mockServerUid, routes: data.routes || [] }));
      loaded.push({
        mockServerUid,
        responses: data.responses || []
      });
    }

    return loaded;
  }
);

export const createMockResponse = createAsyncThunk(
  'mockServer/createResponse',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-create-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    if (result.routes) {
      dispatch(setRouteTable({ mockServerUid: payload.mockServerUid, routes: result.routes }));
    }

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

    if (result.routes) {
      dispatch(setRouteTable({ mockServerUid: payload.mockServerUid, routes: result.routes }));
    }

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

    if (result.routes) {
      dispatch(setRouteTable({ mockServerUid: payload.mockServerUid, routes: result.routes }));
    }

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

    return {
      mockServerUid: payload.mockServerUid,
      createdCount: result.createdCount || 0,
      responses: result.responses || []
    };
  }
);

export const syncMockResponsesFromExamples = createAsyncThunk(
  'mockServer/syncFromExamples',
  async (payload, { dispatch }) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-replace-responses', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    if (result.routes) {
      dispatch(setRouteTable({ mockServerUid: payload.mockServerUid, routes: result.routes }));
    }

    return {
      mockServerUid: payload.mockServerUid,
      responses: result.responses || []
    };
  }
);

export const loadMockResponsesFromSpec = createAsyncThunk(
  'mockServer/loadResponsesFromSpec',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-load-spec-responses', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    return { responses: result.responses || [] };
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

      if (entry?.matched) {
        const key = `${entry.method} ${entry.path}`;
        if (!state.routeHitCounts[uid]) {
          state.routeHitCounts[uid] = {};
        }
        state.routeHitCounts[uid][key] = (state.routeHitCounts[uid][key] || 0) + 1;
      }
    },

    addRequestLogEntries: (state, action) => {
      const { mockServerUid, collectionUid, entries = [] } = action.payload;
      const uid = mockServerUid || collectionUid;

      if (!entries.length) {
        return;
      }

      if (!state.requestLogs[uid]) {
        state.requestLogs[uid] = [];
      }

      state.requestLogs[uid].push(...entries);
      if (state.requestLogs[uid].length > MAX_LOG_ENTRIES) {
        state.requestLogs[uid] = state.requestLogs[uid].slice(-MAX_LOG_ENTRIES);
      }

      if (!state.routeHitCounts[uid]) {
        state.routeHitCounts[uid] = {};
      }

      for (const entry of entries) {
        if (!entry?.matched) {
          continue;
        }

        const key = `${entry.method} ${entry.path}`;
        state.routeHitCounts[uid][key] = (state.routeHitCounts[uid][key] || 0) + 1;
      }
    },

    clearRequestLog: (state, action) => {
      const { mockServerUid, collectionUid } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.requestLogs[uid] = [];
      state.routeHitCounts[uid] = {};
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

      const hitCounts = {};
      for (const entry of entries || []) {
        if (!entry?.matched) {
          continue;
        }

        const key = `${entry.method} ${entry.path}`;
        hitCounts[key] = (hitCounts[key] || 0) + 1;
      }
      state.routeHitCounts[uid] = hitCounts;
    },

    setMockResponses: (state, action) => {
      const { mockServerUid, responses } = action.payload;
      state.mockResponses[mockServerUid] = responses || [];
    },

    removeMockServerData: (state, action) => {
      const { mockServerUid } = action.payload;
      delete state.servers[mockServerUid];
      delete state.requestLogs[mockServerUid];
      delete state.routeHitCounts[mockServerUid];
      delete state.routes[mockServerUid];
      delete state.mockResponses[mockServerUid];
    },

    setMockServerInstances: (state, action) => {
      const { workspaceUid, instances } = action.payload;
      state.instancesByWorkspace[workspaceUid] = instances || [];
    },

    upsertMockServerInstance: (state, action) => {
      const { workspaceUid, instance } = action.payload;
      const instances = [...(state.instancesByWorkspace[workspaceUid] || [])];
      const existingIndex = instances.findIndex((item) => item.uid === instance.uid);

      if (existingIndex >= 0) {
        instances[existingIndex] = instance;
      } else {
        instances.push(instance);
      }

      state.instancesByWorkspace[workspaceUid] = instances;
    },

    removeMockServerInstance: (state, action) => {
      const { workspaceUid, mockServerUid } = action.payload;
      state.instancesByWorkspace[workspaceUid] = (state.instancesByWorkspace[workspaceUid] || [])
        .filter((instance) => instance.uid !== mockServerUid);
    }
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadMockServerInstances.fulfilled, (state, action) => {
        const { workspaceUid, instances } = action.payload;
        state.instancesByWorkspace[workspaceUid] = instances;
      })
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
        state.routeHitCounts[mockServerUid] = {};
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
        state.routeHitCounts[mockServerUid] = {};
      })
      .addCase(loadMockResponses.fulfilled, (state, action) => {
        const { mockServerUid, responses } = action.payload;
        state.mockResponses[mockServerUid] = responses;
      })
      .addCase(loadAllMockResponses.fulfilled, (state, action) => {
        for (const item of action.payload || []) {
          state.mockResponses[item.mockServerUid] = item.responses;
        }
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
      })
      .addCase(syncMockResponsesFromExamples.fulfilled, (state, action) => {
        const { mockServerUid, responses } = action.payload;
        state.mockResponses[mockServerUid] = responses;
      });
  }
});

export const {
  updateServerStatus,
  addRequestLogEntry,
  addRequestLogEntries,
  clearRequestLog,
  setRouteTable,
  setRequestLogs,
  setMockResponses,
  removeMockServerData,
  setMockServerInstances,
  upsertMockServerInstance,
  removeMockServerInstance
} = mockServerSlice.actions;

export default mockServerSlice.reducer;
