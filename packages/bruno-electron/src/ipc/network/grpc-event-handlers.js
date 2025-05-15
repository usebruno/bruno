// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require("@usebruno/requests") 
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { getEnvVars } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');

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
      // Clone the request to avoid modifying the original
      const requestCopy = cloneDeep(request);
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const envVars = getEnvVars(environment);
      const processEnvVars = getProcessEnvVars(collectionUid);
      // Interpolate variables in the request
      interpolateVars(requestCopy.request, envVars, runtimeVariables, processEnvVars);

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid,
        request: requestCopy,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath
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
        request: requestCopy, 
        collection, 
        environment: envVars, 
        runtimeVariables,
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
      // Clone the request to avoid modifying the original
      const requestCopy = cloneDeep(request);
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const processEnvVars = getProcessEnvVars(collectionUid);
      const envVars = getEnvVars(environment);

      console.log("envVars", JSON.stringify(envVars, null, 2), "\nruntimeVariables", JSON.stringify(runtimeVariables, null, 2), "\nprocessEnvVars", JSON.stringify(processEnvVars, null, 2));
      
      // Interpolate variables in the request
      interpolateVars(requestCopy.request, envVars, runtimeVariables, processEnvVars);
      console.log('requestCopy', requestCopy.request.url);
      console.log('requestCopy', JSON.stringify(requestCopy.request.headers, null, 2));

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid,
        request: requestCopy,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath
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
      console.log('requestCopy', requestCopy);
      const url = requestCopy.request.url;
      const metadata = requestCopy.request.headers || {};

      const methods = await grpcClient.loadMethodsFromReflection({ 
        url, 
        metadata, 
        rootCertificate, 
        privateKey, 
        certificateChain, 
        passphrase,
        verifyOptions 
      });

      console.log('methods', methods);
      
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
