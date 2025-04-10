// To implement grpc event handlers
const { ipcMain } = require('electron');
const grpcClient = require('../../utils/grpc');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions }) => {
    try {
      await grpcClient.startConnection({request, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions, window});
      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      return { success: false, error: error.message };
    }
  });

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, message) => {
    try {
      console.log("requestId & message from sendMessage", requestId, message);
      grpcClient.sendMessage(requestId, message);
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
};

module.exports = registerGrpcEventHandlers
