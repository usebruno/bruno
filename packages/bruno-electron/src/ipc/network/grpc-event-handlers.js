// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require('@usebruno/requests');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, get } = require('lodash');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { interpolateString } = require('./interpolate-string');
const path = require('node:path');
const prepareGrpcRequest = require('./prepare-grpc-request');
const { normalizeAndResolvePath } = require('../../utils/filesystem');
const { configureRequest } = require('./prepare-grpc-request');

// Creating grpcClient at module level so it can be accessed from window-all-closed event
let grpcClient;

/**
 * Extract protobuf include directories from collection config
 * @param {Object} collection - The collection object
 * @returns {string[]} Array of resolved include directory paths
 */
const getProtobufIncludeDirs = (collection) => {
  if (!collection) {
    return [];
  }

  const brunoConfig = collection.draft?.brunoConfig || collection.brunoConfig;
  const importPaths = brunoConfig?.protobuf?.importPaths ?? [];

  return importPaths
    .filter(({ enabled }) => Boolean(enabled))
    .map(({ path: relativePath }) => normalizeAndResolvePath(path.resolve(collection.pathname, relativePath)));
};

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  grpcClient = new GrpcClient(sendEvent);

  ipcMain.handle('connections-changed', (event) => {
    sendEvent('grpc:connections-changed', event);
  });

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: preparedRequest,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });

      await configureRequest(
        preparedRequest,
        requestCopy,
        collection,
        preparedRequest.envVars,
        runtimeVariables,
        preparedRequest.processEnvVars,
        preparedRequest.promptVariables,
        certsAndProxyConfig
      );

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
      const pfx = httpsAgentRequestFields.pfx;

      const requestSent = {
        type: 'request',
        url: preparedRequest.url,
        method: preparedRequest.method,
        methodType: preparedRequest.methodType,
        headers: preparedRequest.headers,
        body: preparedRequest.body,
        timestamp: Date.now()
      };

      const includeDirs = getProtobufIncludeDirs(collection);

      // Start gRPC connection with the processed request and certificates
      await grpcClient.startConnection({
        request: preparedRequest,
        collection,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions,
        includeDirs
      });

      sendEvent('grpc:request', preparedRequest.uid, collection.uid, requestSent);

      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      if (error instanceof Error) {
        throw error;
      }
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

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, collectionUid, message) => {
    try {
      grpcClient.sendMessage(requestId, collectionUid, message);
      sendEvent('grpc:message', requestId, collectionUid, message);
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
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables);

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: preparedRequest,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });

      await configureRequest(
        preparedRequest,
        requestCopy,
        collection,
        preparedRequest.envVars,
        runtimeVariables,
        preparedRequest.processEnvVars,
        preparedRequest.promptVariables,
        certsAndProxyConfig
      );

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
      const pfx = httpsAgentRequestFields.pfx;

      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo
        });
      }

      const methods = await grpcClient.loadMethodsFromReflection({
        request: preparedRequest,
        collectionUid: collection.uid,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions,
        sendEvent
      });

      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods)) };
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, collection }) => {
    try {
      const includeDirs = getProtobufIncludeDirs(collection);

      const methods = await grpcClient.loadMethodsFromProtoFile(filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods)) };
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate a sample gRPC message based on method path
  ipcMain.handle('grpc:generate-sample-message', async (event, { methodPath, existingMessage, options = {} }) => {
    try {
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

  // Generate grpcurl command for a request
  ipcMain.handle('grpc:generate-grpcurl', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});

      const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
      if (!protocolRegex.test(preparedRequest.url)) {
        preparedRequest.url = `http://${preparedRequest.url}`;
      }

      const interpolationOptions = {
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars
      };
      let caCertFilePath, certFilePath, keyFilePath;

      if (preferencesUtil.shouldUseCustomCaCertificate()) {
        caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
      }

      const clientCertConfig = collection.draft?.brunoConfig ? get(collection, 'draft.brunoConfig.clientCertificates.certs', []) : get(collection, 'brunoConfig.clientCertificates.certs', []);

      for (let clientCert of clientCertConfig) {
        const domain = interpolateString(clientCert?.domain, interpolationOptions);
        const type = clientCert?.type || 'cert';
        if (domain) {
          const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/)' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
          const requestUrl = interpolateString(preparedRequest.url, interpolationOptions);
          if (requestUrl.match(hostRegex)) {
            if (type === 'cert') {
              certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
              certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collection.pathname, certFilePath);
              keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
              keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collection.pathname, keyFilePath);
            }
          }
        }
      }
      // Generate the grpcurl command
      const command = grpcClient.generateGrpcurlCommand({
        request: preparedRequest,
        collectionPath: collection.pathname,
        certificates: {
          ca: caCertFilePath,
          cert: certFilePath,
          key: keyFilePath
        }
      });

      return { success: true, command };
    } catch (error) {
      console.error('Error generating grpcurl command:', error);
      return { success: false, error: error.message };
    }
  });
};

// Clean up gRPC connections when all windows are closed
if (app && typeof app.on === 'function') {
  app.on('window-all-closed', () => {
    if (grpcClient && typeof grpcClient.clearAllConnections === 'function') {
      try {
        grpcClient.clearAllConnections();
      } catch (error) {
        console.error('Error clearing gRPC connections:', error);
      }
    }
  });
}

module.exports = registerGrpcEventHandlers;
