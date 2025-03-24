// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require("@usebruno/requests") 
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { getEnvVars, getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, mergeAuth } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const { setAuthHeaders } = require('./prepare-request');

const prepareRequest = (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft ? get(collection, 'draft', {}) : get(collection, 'root', {});
  const headers = {};
  let url = request.url;

  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });

  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled && h.name.length > 0) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });
  
  const processEnvVars = getProcessEnvVars(collection.uid);
  const envVars = getEnvVars(environment);

  let grpcRequest = {
    uid: item.uid,
    mode: request.body.mode,
    method: request.method,
    url,
    headers,
    processEnvVars,
    envVars,
    runtimeVariables,
    body: request.body
  }

  grpcRequest = setAuthHeaders(grpcRequest, request, collectionRoot);

  interpolateVars(grpcRequest, envVars, runtimeVariables, processEnvVars);

  return grpcRequest;
}

// Creating grpcClient at module level so it can be accessed from window-all-closed event
let grpcClient;

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
   const sendEvent = (eventName, ...args) => {
    if (window && window.webContents) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  grpcClient = new GrpcClient(sendEvent);
 
  ipcMain.handle('connections-changed', (event) => {
    console.log('GrpcClient connections changed:', event);
    sendEvent('grpc:connections-changed', event);
  });

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables }) => {
    console.log('Starting gRPC connection:', { request, collection, environment, runtimeVariables});
    
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = prepareRequest(requestCopy, collection, environment, runtimeVariables);

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname
      });

      // Extract certificate information from the config
      const { httpsAgentRequestFields } = certsAndProxyConfig;
      
      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;

      // Start gRPC connection with the processed request and certificates
      await grpcClient.startConnection({
        request: preparedRequest, 
        collection,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        verifyOptions
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      sendEvent('grpc:error', request.uid, collection.uid, { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // Get all active connection IDs
  ipcMain.handle('grpc:get-active-connections', (event) => {
    try {
      const activeConnectionIds = grpcClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });

  // Send request sent information to renderer
  ipcMain.handle('main:grpc-request-sent', (event, requestId, collectionUid, requestSent) => {
    try {
      sendEvent('main:grpc-request-sent', requestId, collectionUid, requestSent);
      return { success: true };
    } catch (error) {
      console.error('Error sending request info:', error);
      return { success: false, error: error.message };
    }
  });

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, message) => {
    try {
      grpcClient.sendMessage(requestId, message, sendEvent);
      return { success: true };
    } catch (error) {
      console.error('Error sending gRPC message:', error);
      return { success: false, error: error.message };
    }
  });

  // End a streaming request
  ipcMain.handle('grpc:end-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      grpcClient.end(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error ending gRPC stream:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel a request
  ipcMain.handle('grpc:cancel-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      grpcClient.cancel(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error cancelling gRPC request:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from server reflection
  ipcMain.handle('grpc:load-methods-reflection', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      // Clone the request to avoid modifying the original
      const preparedRequest = prepareRequest(requestCopy, collection, environment, runtimeVariables);
      
      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname
      });

      // Extract certificate information from the config
      const { httpsAgentRequestFields } = certsAndProxyConfig;
      
      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;

      // Extract URL and metadata from the request
      console.log('preparedRequest', JSON.stringify(preparedRequest.headers, null, 2));

      const methods = await grpcClient.loadMethodsFromReflection({ 
        request: preparedRequest,
        collectionUid: collection.uid,
        rootCertificate, 
        privateKey, 
        certificateChain, 
        passphrase,
        verifyOptions,
        sendEvent
      });
      
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, includeDirs }) => {
    try {
      const methods = await grpcClient.loadMethodsFromProtoFile(filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate a sample gRPC message based on method path
  ipcMain.handle('grpc:generate-sample-message', async (event, { methodPath, existingMessage, options = {} }) => {
    try {
      console.log(`Generating sample message for method: ${methodPath}`);
      
      // Generate the sample message
      const result = grpcClient.generateSampleMessage(methodPath, {
        ...options,
        // Parse existing message if provided
        existingMessage: existingMessage ? safeParseJSON(existingMessage) : null
      });
      
      if (!result.success) {
        return { 
          success: false, 
          error: result.error || 'Failed to generate sample message' 
        };
      }
      
      // Convert the message to a JSON string for safe transfer through IPC
      return { 
        success: true, 
        message: JSON.stringify(result.message, null, 2) 
      };
    } catch (error) {
      console.error('Error generating gRPC sample message:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to generate sample message' 
      };
    }
  });
};

// Clean up gRPC connections when all windows are closed
app.on('window-all-closed', () => {
  if (grpcClient && typeof grpcClient.clearAllConnections === 'function') {
    try {
      grpcClient.clearAllConnections();
    } catch (error) {
      console.error('Error clearing gRPC connections:', error);
    }
  }
});

module.exports = registerGrpcEventHandlers
