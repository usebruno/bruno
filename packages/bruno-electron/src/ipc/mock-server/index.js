const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { getWorkspaceApiSpecs, validateWorkspacePath } = require('../../utils/workspace-config');
const mockServer = require('../../app/mock-server/mock-server');
const { buildMockResponsesFromSpec } = require('../../app/mock-server/mock-spec-routes');
const {
  appendMockResponses,
  cloneMockServerResponses,
  createEmptyMockResponse,
  deleteMockResponse,
  deleteMockServer,
  flushAllWorkspaceStores,
  listMockResponses,
  listMockServers,
  saveMockResponse,
  saveMockServer,
  setMockServerResponses
} = require('../../app/mock-server/mock-response-store');

const getResponses = (location) => listMockResponses(location);

const parseSpecContent = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    const yaml = require('js-yaml');
    return yaml.load(content);
  }
};

const readWorkspaceSpec = (workspacePath, specPath) => {
  if (!specPath) {
    throw new Error('API spec path is required.');
  }

  validateWorkspacePath(workspacePath);

  const resolvedPath = path.resolve(specPath);
  const isRegisteredSpec = getWorkspaceApiSpecs(workspacePath)
    .some((spec) => spec.path && path.resolve(spec.path) === resolvedPath);

  if (!isRegisteredSpec) {
    throw new Error('API spec is not registered in this workspace.');
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error('API spec file not found.');
  }

  return parseSpecContent(fs.readFileSync(resolvedPath, 'utf8'));
};

const registerMockServerIpc = (mainWindow) => {
  mockServer.setMainWindow(mainWindow);

  ipcMain.handle('renderer:mock-server-suggest-port', async (_event, payload = {}) => {
    try {
      const startPort = Number(payload.startPort) || undefined;
      const port = await mockServer.suggestPort(startPort, {
        additionalUsedPorts: payload.additionalUsedPorts || []
      });
      return { success: true, port };
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

  ipcMain.handle('renderer:mock-server-refresh-routes', async (_event, payload) => {
    try {
      const mockServerUid = payload.mockServerUid || payload.collectionUid;
      const result = await mockServer.refreshRoutes(mockServerUid, payload);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
      log: mockServer.getLog(uid)
    };
  });

  ipcMain.handle('renderer:mock-server-get-responses-and-routes', async (_event, payload) => {
    try {
      return { success: true, responses: getResponses(payload) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-load-all-responses', async (_event, { locations = [] }) => {
    try {
      const results = {};

      for (const location of locations) {
        if (!location?.mockServerUid) {
          continue;
        }

        results[location.mockServerUid] = { responses: getResponses(location) };
      }

      return { success: true, results };
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
      const routeResult = await mockServer.reloadRoutesFromStore(payload.mockServerUid, payload);
      return { success: true, response: savedResponse, routes: routeResult?.routes || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-save-response', async (_event, payload) => {
    try {
      const { response, ...location } = payload;
      const savedResponse = saveMockResponse(location, response);
      const routeResult = await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, response: savedResponse, routes: routeResult?.routes || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-delete-response', async (_event, payload) => {
    try {
      const { responseUid, ...location } = payload;
      deleteMockResponse(location, responseUid);
      const routeResult = await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, responseUid, routes: routeResult?.routes || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-replace-responses', async (_event, payload) => {
    try {
      const { responses, ...location } = payload;
      setMockServerResponses(location, responses || []);
      const routeResult = await mockServer.reloadRoutesFromStore(location.mockServerUid, location);
      return { success: true, responses: responses || [], routes: routeResult?.routes || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-list-instances', async (_event, payload) => {
    try {
      const { workspacePath, workspaceUid, migrateFrom = [] } = payload;

      validateWorkspacePath(workspacePath);

      const instances = listMockServers(workspacePath, workspaceUid, { migrateFrom });
      return { success: true, instances };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('renderer:mock-server-save-instance', async (_event, payload) => {
    try {
      const { workspacePath, instance } = payload;

      validateWorkspacePath(workspacePath);

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

      validateWorkspacePath(workspacePath);

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

  ipcMain.handle('renderer:mock-server-build-spec-responses', async (_event, payload) => {
    try {
      const {
        specPath,
        generateFromSchema = false,
        persist = false,
        workspacePath,
        ...location
      } = payload;

      const spec = readWorkspaceSpec(workspacePath || location.workspacePath, specPath);
      const generatedResponses = buildMockResponsesFromSpec(spec, { generateFromSchema: Boolean(generateFromSchema) });

      if (!persist) {
        return { success: true, responses: generatedResponses };
      }

      const createdResponses = appendMockResponses({ ...location, workspacePath }, generatedResponses);
      await mockServer.reloadRoutesFromStore(location.mockServerUid, { ...location, workspacePath });

      return {
        success: true,
        createdCount: createdResponses.length,
        responses: listMockResponses({ ...location, workspacePath })
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('main:start-quit-flow', () => {
    flushAllWorkspaceStores();
    mockServer.stopAll().catch((err) => {
      console.error('[MockServer] Error stopping servers on quit:', err.message);
    });
  });
};

module.exports = registerMockServerIpc;
