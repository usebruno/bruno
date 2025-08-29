// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require("@usebruno/requests") 
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { getEnvVars, getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, mergeAuth, getFormattedCollectionOauth2Credentials } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const { getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingAuthorizationCode } = require('../../utils/oauth2');
const { interpolateString } = require('./interpolate-string');
const path = require('node:path');
const { setAuthHeaders } = require('./prepare-request');

const prepareRequest = async (item, collection, environment, runtimeVariables, certsAndProxyConfig = {}) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft ? get(collection, 'draft', {}) : get(collection, 'root', {});
  const headers = {};
  const url = request.url;
  let contentTypeDefined = false;

  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });

  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeAuth(collection, request, requestTreePath);
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
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
    methodType: request.methodType,
    url,
    headers,
    processEnvVars,
    envVars,
    runtimeVariables,
    body: request.body,
    protoPath: request.protoPath,
    // Add variable properties for interpolation
    vars: request.vars,
    collectionVariables: request.collectionVariables,
    folderVariables: request.folderVariables,
    requestVariables: request.requestVariables,
    globalEnvironmentVariables: request.globalEnvironmentVariables,
    oauth2CredentialVariables: request.oauth2CredentialVariables,
  }

  grpcRequest = setAuthHeaders(grpcRequest, request, collectionRoot);

  if (grpcRequest.oauth2) {
    let requestCopy = cloneDeep(grpcRequest);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey } = {} } = requestCopy || {};
    let credentials, credentialsId, oauth2Url, debugInfo;
    switch (grantType) {
      case 'authorization_code':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingAuthorizationCode({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfig }));
        grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingClientCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfig }));
        grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingPasswordCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfig }));
        grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        }
        else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          }
          catch(error) {}
        }
        break;
    }
  }

  // Note: Complex auth modes like AWS Sig v4, Digest, and NTLM are not supported in gRPC
  // because they require axios interceptors and complex HTTP-specific logic that cannot
  // be applied to gRPC metadata. Only simple header-based auth modes work with gRPC as of now.

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
    sendEvent('grpc:connections-changed', event);
  });

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables }) => {
    
    try {
      const requestCopy = cloneDeep(request);
    

      const preparedRequest = await prepareRequest(requestCopy, collection, environment, runtimeVariables, {});

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy.request,
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
      const pfx = httpsAgentRequestFields.pfx;

      const requestSent = {
        type: "request",
        url: preparedRequest.url,
        method: preparedRequest.method,
        methodType: preparedRequest.methodType,
        headers: preparedRequest.headers,
        body: preparedRequest.body,
        timestamp: Date.now()
      }
      // Start gRPC connection with the processed request and certificates
      await grpcClient.startConnection({
        request: preparedRequest, 
        collection,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions
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
          debugInfo: preparedRequest.oauth2Credentials.debugInfo,
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
      const preparedRequest = await prepareRequest(requestCopy, collection, environment, runtimeVariables);
      
      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy.request,
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
      const pfx = httpsAgentRequestFields.pfx;


      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo,
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
      const preparedRequest = await prepareRequest(requestCopy, collection, environment, runtimeVariables, {});
      const interpolationOptions = {
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars
      };
      let caCertFilePath, certFilePath, keyFilePath;

      if(preferencesUtil.shouldUseCustomCaCertificate()) {
        caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
      }

      const clientCertConfig = get(collection, 'brunoConfig.clientCertificates.certs', []);

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

module.exports = registerGrpcEventHandlers
