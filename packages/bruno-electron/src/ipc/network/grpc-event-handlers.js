// To implement grpc event handlers
const { ipcMain } = require('electron');
const grpcClient = require('../../utils/grpc');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = () => {
  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, certificateChain, privateKey, rootCertificate, verifyOptions }) => {
    try {
      await grpcClient.startConnection(event, {request, certificateChain, privateKey, rootCertificate, verifyOptions});
      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      return { success: false, error: error.message };
    }
  });

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, body) => {
    try {
      grpcClient.sendMessage(event, requestId, body);
      return { success: true };
    } catch (error) {
      console.error('Error sending gRPC message:', error);
      return { success: false, error: error.message };
    }
  });

  // End a streaming request
  ipcMain.handle('grpc:end', (event, requestId) => {
    try {
      grpcClient.end(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error ending gRPC stream:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel a request
  ipcMain.handle('grpc:cancel', (event, requestId) => {
    try {
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
      const methods = await grpcClient.loadMethodsFromReflection(event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions });
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, includeDirs }) => {
    try {
      const methods = await grpcClient.loadMethodsFromProtoFile(event, filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('grpc:load-methods-buf-reflection', async (event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions }) => {
    try {
      const methods = await grpcClient.loadMethodsFromBufReflection(event, { url, metadata, rootCertificate, privateKey, certificateChain, verifyOptions });
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from buf reflection:', error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = registerGrpcEventHandlers
