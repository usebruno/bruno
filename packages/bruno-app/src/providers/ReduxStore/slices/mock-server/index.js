import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 500;

const initialState = {
  servers: {},
  requestLogs: {},
  mockResponses: {},
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

    dispatch(updateServerStatus({
      mockServerUid,
      status: 'running',
      port: result.port,
      baseUrl: result.baseUrl,
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
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-refresh-routes', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

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

export const loadMockResponses = createAsyncThunk(
  'mockServer/loadResponses',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-get-responses-and-routes', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      mockServerUid: payload.mockServerUid,
      responses: result.responses || []
    };
  }
);

export const loadAllMockResponses = createAsyncThunk(
  'mockServer/loadAllResponses',
  async ({ locations }) => {
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
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-create-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      mockServerUid: payload.mockServerUid,
      response: result.response
    };
  }
);

export const saveMockResponse = createAsyncThunk(
  'mockServer/saveResponse',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-save-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      mockServerUid: payload.mockServerUid,
      response: result.response
    };
  }
);

export const deleteMockResponse = createAsyncThunk(
  'mockServer/deleteResponse',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-delete-response', payload);
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      mockServerUid: payload.mockServerUid,
      responseUid: payload.responseUid
    };
  }
);

export const generateMockResponsesFromSpec = createAsyncThunk(
  'mockServer/generateFromSpec',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-build-spec-responses', {
      ...payload,
      persist: true
    });
    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      mockServerUid: payload.mockServerUid,
      createdCount: result.createdCount || 0,
      responses: result.responses || []
    };
  }
);

export const syncMockResponsesFromExamples = createAsyncThunk(
  'mockServer/syncFromExamples',
  async (payload) => {
    const result = await window.ipcRenderer.invoke('renderer:mock-server-replace-responses', payload);
    if (!result.success) {
      throw new Error(result.error);
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
    const result = await window.ipcRenderer.invoke('renderer:mock-server-build-spec-responses', {
      ...payload,
      persist: false,
      generateFromSchema: payload.generateFromSchema ?? true
    });
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
    },

    setRequestLogs: (state, action) => {
      const { mockServerUid, collectionUid, entries } = action.payload;
      const uid = mockServerUid || collectionUid;
      state.requestLogs[uid] = entries || [];
    },

    removeMockServerData: (state, action) => {
      const { mockServerUid } = action.payload;
      delete state.servers[mockServerUid];
      delete state.requestLogs[mockServerUid];
      delete state.mockResponses[mockServerUid];
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
          error: null,
          routeCount: 0,
          exampleCount: 0,
          globalDelay: 0
        };
        state.requestLogs[mockServerUid] = [];
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
        const { mockServerUid, responses } = action.payload;
        state.mockResponses[mockServerUid] = responses || [];
      })
      .addCase(syncMockResponsesFromExamples.fulfilled, (state, action) => {
        const { mockServerUid, responses } = action.payload;
        state.mockResponses[mockServerUid] = responses;
      });
  }
});

export const {
  updateServerStatus,
  addRequestLogEntries,
  setRequestLogs,
  removeMockServerData,
  upsertMockServerInstance,
  removeMockServerInstance
} = mockServerSlice.actions;

export default mockServerSlice.reducer;
