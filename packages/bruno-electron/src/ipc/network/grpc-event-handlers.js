// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require("@usebruno/requests") 
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
  const grpcClient = new GrpcClient();
  const sendEvent = (eventName, ...args) => {
    if (window && window.webContents) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions }) => {
    try {
      await grpcClient.startConnection({request, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions, callback: sendEvent});
      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      sendEvent('grpc:error', request.uid, collection.uid, { error: error.message });
      return { success: false, error: error.message };
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
  ipcMain.handle('grpc:load-methods-reflection', async (event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions }) => {
    try {
      const methods = await grpcClient.loadMethodsFromReflection({ url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions });
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, includeDirs }) => {
    try {
      const methods = await grpcClient.loadMethodsFromProtoFile( filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if a gRPC connection is active
  ipcMain.handle('grpc:is-connection-active', (event, requestId) => {
    try {
      const isActive = grpcClient.isConnectionActive(requestId);
      return { success: true, isActive };
    } catch (error) {
      console.error('Error checking gRPC connection status:', error);
      return { success: false, error: error.message, isActive: false };
    }
  });

  ipcMain.handle('grpc:load-methods-buf-reflection', async (event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions }) => {
    try {
      const methods = await grpcClient.loadMethodsFromBufReflection({ url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions });
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from buf reflection:', error);
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

app.on('window-all-closed', () => {
  grpcClient.clearAllConnections();
});

module.exports = registerGrpcEventHandlers
