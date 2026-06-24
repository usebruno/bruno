const { ipcMain } = require('electron');
const fs = require('fs');
const mockServer = require('../app/mock-server');
const { buildMockResponsesFromSpec } = require('../app/mock-spec-routes');
const {
  appendMockResponses,
  cloneMockServerResponses,
  createEmptyMockResponse,
  deleteMockResponse,
  deleteMockServer,
  listMockResponses,
  listMockServers,
  saveMockResponse,
  saveMockServer,
  setMockServerResponses
} = require('../app/mock-response-store');

const parseSpecContent = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    const yaml = require('js-yaml');
    return yaml.load(content);
  }
};

const registerMockServerIpc = (mainWindow) => {
  mockServer.setMainWindow(mainWindow);

  ipcMain.handle('renderer:mock-server-suggest-port', async (_event, payload = {}) => {
    try {
      const startPort = Number(payload.startPort) || undefined;
      const port = await mockServer.suggestPort(startPort, {
        additionalUsedPorts: payload.additionalUsedPorts || []
      });
      return { success: true, port, mode: mockServer.getMockMode() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-try-request', async (_event, payload) => {
    try {
      const result = await mockServer.tryMockRequest(payload);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-check-port', async (_event, payload = {}) => {
    try {
      const result = await mockServer.checkPortAvailable(payload.port, {
        mockServerUid: payload.mockServerUid || null,
        additionalUsedPorts: payload.additionalUsedPorts || []
      });
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-start', async (_event, payload) => {
    try {
      const result = await mockServer.start(payload);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-stop', async (_event, { mockServerUid, collectionUid }) => {
    try {
      await mockServer.stop(mockServerUid || collectionUid);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-status', async (_event, payload) => {
    const mockServerUid = payload.mockServerUid || payload.collectionUid;
    return mockServer.getStatus(mockServerUid, payload);
  });

  ipcMain.handle('renderer:mock-server-refresh-routes', async (_event, payload) => {
    try {
      const mockServerUid = payload.mockServerUid || payload.collectionUid;
      const result = await mockServer.refreshRoutes(mockServerUid, payload);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-get-routes', async (_event, payload) => {
    const mockServerUid = payload.mockServerUid || payload.collectionUid;
    return mockServer.getRoutes(mockServerUid, payload);
  });

  ipcMain.handle('renderer:mock-server-get-log', async (_event, { mockServerUid, collectionUid }) => {
    return mockServer.getLog(mockServerUid || collectionUid);
  });

  ipcMain.handle('renderer:mock-server-set-delay', async (_event, { mockServerUid, collectionUid, delay }) => {
    try {
      mockServer.setDelay(mockServerUid || collectionUid, delay);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-clear-log', async (_event, { mockServerUid, collectionUid }) => {
    mockServer.clearLog(mockServerUid || collectionUid);
    return { success: true };
  });

  ipcMain.handle('renderer:mock-server-get-running', async () => {
    return mockServer.getRunningMockServerUids();
  });

  ipcMain.handle('renderer:mock-server-sync-state', async (_event, payload) => {
    const uid = payload.mockServerUid || payload.collectionUid;
    return {
      status: mockServer.getStatus(uid, payload),
      routes: mockServer.getRoutes(uid, payload),
      log: mockServer.getLog(uid)
    };
  });

  ipcMain.handle('renderer:mock-server-get-responses', async (_event, payload) => {
    try {
      const responses = listMockResponses(payload);
      return { success: true, responses };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-create-response', async (_event, payload) => {
    try {
      const response = createEmptyMockResponse(payload?.name);
      if (payload?.description) {
        response.description = payload.description;
      }
      if (payload?.statusCode) {
        response.response.status = Number(payload.statusCode) || 200;
      }
      if (payload?.bodyType) {
        response.response.body.type = payload.bodyType;
      }
      const savedResponse = saveMockResponse(payload, response);
      await mockServer.reloadRoutesFromStore(payload.mockServerUid, payload);
      return { success: true, response: savedResponse };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-save-response', async (_event, payload) => {
    try {
      const { response, ...location } = payload;
      const savedResponse = saveMockResponse(location, response);
      await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, response: savedResponse };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-delete-response', async (_event, payload) => {
    try {
      const { responseUid, ...location } = payload;
      deleteMockResponse(location, responseUid);
      await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, responseUid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-replace-responses', async (_event, payload) => {
    try {
      const { responses, ...location } = payload;
      setMockServerResponses(location, responses || []);
      await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, responses: responses || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-list-instances', async (_event, payload) => {
    try {
      const { workspacePath, workspaceUid, migrateFrom = [] } = payload;

      if (!workspacePath) {
        throw new Error('Workspace path is required.');
      }

      const instances = listMockServers(workspacePath, workspaceUid, { migrateFrom });
      return { success: true, instances };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-save-instance', async (_event, payload) => {
    try {
      const { workspacePath, instance } = payload;

      if (!workspacePath) {
        throw new Error('Workspace path is required.');
      }

      if (!instance?.uid) {
        throw new Error('Mock server id is required.');
      }

      const savedInstance = saveMockServer(workspacePath, instance);
      return { success: true, instance: savedInstance };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-delete', async (_event, payload) => {
    try {
      deleteMockServer(payload);
      await mockServer.reloadRoutesFromStore(payload.mockServerUid, payload);
      return { success: true, mockServerUid: payload.mockServerUid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-clone-responses', async (_event, payload) => {
    try {
      const { sourceMockServerUid, targetMockServerUid, workspacePath } = payload;

      if (!sourceMockServerUid || !targetMockServerUid) {
        throw new Error('Mock server id is required.');
      }

      if (!workspacePath) {
        throw new Error('Workspace path is required.');
      }

      const location = { mockServerUid: sourceMockServerUid, workspacePath };
      const targetLocation = { mockServerUid: targetMockServerUid, workspacePath };
      const responses = cloneMockServerResponses(location, targetLocation);
      await mockServer.reloadRoutesFromStore(targetMockServerUid, {
        mockServerUid: targetMockServerUid,
        workspacePath
      });

      return {
        success: true,
        responseCount: responses.length
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-generate-from-spec', async (_event, payload) => {
    try {
      const { specPath, generateFromSchema = false, ...location } = payload;

      if (!specPath) {
        throw new Error('API spec path is required.');
      }

      if (!fs.existsSync(specPath)) {
        throw new Error('API spec file not found.');
      }

      const content = fs.readFileSync(specPath, 'utf8');
      const spec = parseSpecContent(content);
      const generatedResponses = buildMockResponsesFromSpec(spec, { generateFromSchema: Boolean(generateFromSchema) });
      const createdResponses = appendMockResponses(location, generatedResponses);
      await mockServer.reloadRoutesFromStore(location.mockServerUid, location);

      return {
        success: true,
        createdCount: createdResponses.length,
        responses: createdResponses
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('main:start-quit-flow', () => {
    mockServer.stopAll().catch((err) => {
      console.error('[MockServer] Error stopping servers on quit:', err.message);
    });
  });
};

module.exports = registerMockServerIpc;
