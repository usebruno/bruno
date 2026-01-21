const { ipcMain, app } = require('electron');
const { WsClient } = require('@usebruno/requests');
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const {
  getEnvVars,
  getTreePathFromCollectionToItem,
  mergeHeaders,
  mergeScripts,
  mergeVars,
  mergeAuth,
  getFormattedCollectionOauth2Credentials
} = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const {
  getOAuth2TokenUsingPasswordCredentials,
  getOAuth2TokenUsingClientCredentials,
  getOAuth2TokenUsingAuthorizationCode
} = require('../../utils/oauth2');
const { interpolateString } = require('./interpolate-string');
const path = require('node:path');
const { setAuthHeaders } = require('./prepare-request');

const prepareWsRequest = async (item, collection, environment, runtimeVariables, certsAndProxyConfig = {}) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft?.root ? get(collection, 'draft.root', {}) : get(collection, 'root', {});
  const brunoConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig', {})
    : get(collection, 'brunoConfig', {});
  const rawHeaders = cloneDeep(request.headers ?? []);
  const headers = {};

  const scriptFlow = brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({
      oauth2Credentials: collection?.oauth2Credentials
    });
  }

  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      return false;
    }
  });

  each(get(request, 'headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  const socketProtocols = rawHeaders
    .filter((header) => {
      return header.name && header.name.toLowerCase() === 'sec-websocket-protocol' && header.enabled;
    })
    .map((d) => d.value.trim())
    .join(',');

  if (socketProtocols.length > 0) {
    headers['Sec-WebSocket-Protocol'] = socketProtocols;
  }

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars(collection.uid);
  const { promptVariables = {} } = collection;

  let wsRequest = {
    uid: item.uid,
    mode: request.body.mode,
    url: request.url,
    headers,
    processEnvVars,
    envVars,
    runtimeVariables,
    body: request.body,
    // Add variable properties for interpolation
    vars: request.vars,
    collectionVariables: request.collectionVariables,
    folderVariables: request.folderVariables,
    requestVariables: request.requestVariables,
    globalEnvironmentVariables: request.globalEnvironmentVariables,
    oauth2CredentialVariables: request.oauth2CredentialVariables
  };

  wsRequest = setAuthHeaders(wsRequest, request, collection);

  if (wsRequest.oauth2) {
    let requestCopy = cloneDeep(wsRequest);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey, accessTokenUrl, refreshTokenUrl } = {}, collectionVariables, folderVariables, requestVariables } = requestCopy || {};

    // Get cert/proxy configs for token and refresh URLs
    let certsAndProxyConfigForTokenUrl = certsAndProxyConfig;
    let certsAndProxyConfigForRefreshUrl = certsAndProxyConfig;

    if (accessTokenUrl && grantType !== 'implicit') {
      const interpolatedTokenUrl = interpolateString(accessTokenUrl, {
        globalEnvironmentVariables: request.globalEnvironmentVariables,
        collectionVariables,
        envVars,
        folderVariables,
        requestVariables,
        runtimeVariables,
        processEnvVars,
        promptVariables
      });
      const tokenRequestForConfig = { ...requestCopy, url: interpolatedTokenUrl };
      certsAndProxyConfigForTokenUrl = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: tokenRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: request.globalEnvironmentVariables
      });
    }

    const tokenUrlForRefresh = refreshTokenUrl || accessTokenUrl;
    if (tokenUrlForRefresh && grantType !== 'implicit') {
      const interpolatedRefreshUrl = interpolateString(tokenUrlForRefresh, {
        globalEnvironmentVariables: request.globalEnvironmentVariables,
        collectionVariables,
        envVars,
        folderVariables,
        requestVariables,
        runtimeVariables,
        processEnvVars,
        promptVariables
      });
      const refreshRequestForConfig = { ...requestCopy, url: interpolatedRefreshUrl };
      certsAndProxyConfigForRefreshUrl = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        collection,
        request: refreshRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: request.globalEnvironmentVariables
      });
    }

    let credentials, credentialsId, oauth2Url, debugInfo;

    switch (grantType) {
      case 'authorization_code':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({
          credentials,
          url: oauth2Url,
          credentialsId,
          debugInfo
        } = await getOAuth2TokenUsingAuthorizationCode({
          request: requestCopy,
          collectionUid: collection.uid,
          certsAndProxyConfigForTokenUrl,
          certsAndProxyConfigForRefreshUrl
        }));
        wsRequest.oauth2Credentials = {
          credentials,
          url: oauth2Url,
          collectionUid: collection.uid,
          credentialsId,
          debugInfo,
          folderUid: request.oauth2Credentials?.folderUid
        };
        if (tokenPlacement == 'header') {
          wsRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({
          credentials,
          url: oauth2Url,
          credentialsId,
          debugInfo
        } = await getOAuth2TokenUsingClientCredentials({
          request: requestCopy,
          collectionUid: collection.uid,
          certsAndProxyConfigForTokenUrl,
          certsAndProxyConfigForRefreshUrl
        }));
        wsRequest.oauth2Credentials = {
          credentials,
          url: oauth2Url,
          collectionUid: collection.uid,
          credentialsId,
          debugInfo,
          folderUid: request.oauth2Credentials?.folderUid
        };
        if (tokenPlacement == 'header') {
          wsRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({
          credentials,
          url: oauth2Url,
          credentialsId,
          debugInfo
        } = await getOAuth2TokenUsingPasswordCredentials({
          request: requestCopy,
          collectionUid: collection.uid,
          certsAndProxyConfigForTokenUrl,
          certsAndProxyConfigForRefreshUrl
        }));
        wsRequest.oauth2Credentials = {
          credentials,
          url: oauth2Url,
          collectionUid: collection.uid,
          credentialsId,
          debugInfo,
          folderUid: request.oauth2Credentials?.folderUid
        };
        if (tokenPlacement == 'header') {
          wsRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) {}
        }
        break;
    }
  }

  // Add API key to the URL if placement is queryparams
  if (wsRequest.apiKeyAuthValueForQueryParams && wsRequest.apiKeyAuthValueForQueryParams.placement === 'queryparams') {
    try {
      const urlObj = new URL(wsRequest.url);

      const globalEnvironmentVariables = request.globalEnvironmentVariables;
      const promptVariables = collection?.promptVariables || {};

      const interpolationOptions = {
        globalEnvironmentVariables,
        envVars,
        runtimeVariables,
        promptVariables,
        processEnvVars
      };

      const key = interpolateString(wsRequest.apiKeyAuthValueForQueryParams.key, interpolationOptions);
      const value = interpolateString(wsRequest.apiKeyAuthValueForQueryParams.value, interpolationOptions);

      urlObj.searchParams.set(key, value);
      wsRequest.url = urlObj.toString();
    } catch (error) {
      console.error('Error adding API key to WebSocket URL:', error);
    }
  }

  delete wsRequest.apiKeyAuthValueForQueryParams;

  interpolateVars(wsRequest, envVars, runtimeVariables, processEnvVars);

  return wsRequest;
};

// Creating wsClient at module level so it can be accessed from window-all-closed event
let wsClient;

/**
 * Register IPC handlers for WebSocket
 */
const registerWsEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && window.webContents) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  wsClient = new WsClient(sendEvent);

  // Start a new WebSocket connection
  ipcMain.handle(
    'renderer:ws:start-connection',
    async (event, { request, collection, environment, runtimeVariables, settings, options = {} }) => {
      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = await prepareWsRequest(requestCopy, collection, environment, runtimeVariables, {});
        const connectOnly = options?.connectOnly ?? false;
        const requestSent = {
          type: 'request',
          url: preparedRequest.url,
          headers: preparedRequest.headers,
          body: preparedRequest.body,
          timestamp: Date.now()
        };

        if (!connectOnly) {
          const hasMessages = preparedRequest.body.ws.some((msg) => msg.content.length);
          if (hasMessages) {
            preparedRequest.body.ws.forEach((message) => {
              wsClient.queueMessage(preparedRequest.uid, collection.uid, message.content);
            });
          }
        }

        // Get certificates and proxy configuration
        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid: collection.uid,
          collection,
          request: requestCopy.request,
          envVars: preparedRequest.envVars,
          runtimeVariables,
          processEnvVars: preparedRequest.processEnvVars,
          collectionPath: collection.pathname,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        });

        const { httpsAgentRequestFields } = certsAndProxyConfig;

        const sslOptions = {
          rejectUnauthorized: preferencesUtil.shouldVerifyTls(),
          ca: httpsAgentRequestFields.ca,
          cert: httpsAgentRequestFields.cert,
          key: httpsAgentRequestFields.key,
          pfx: httpsAgentRequestFields.pfx,
          passphrase: httpsAgentRequestFields.passphrase
        };

        // Start WebSocket connection
        await wsClient.startConnection({
          request: preparedRequest,
          collection,
          options: {
            timeout: settings.timeout,
            keepAlive: settings.keepAliveInterval > 0 ? true : false,
            keepAliveInterval: settings.keepAliveInterval,
            sslOptions
          }
        });

        sendEvent('main:ws:request', preparedRequest.uid, collection.uid, requestSent);

        // Send OAuth credentials update if available
        if (preparedRequest?.oauth2Credentials) {
          window.webContents.send('main:credentials-update', {
            credentials: preparedRequest.oauth2Credentials?.credentials,
            url: preparedRequest.oauth2Credentials?.url,
            collectionUid: collection.uid,
            credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
            ...(preparedRequest.oauth2Credentials?.folderUid
              ? { folderUid: preparedRequest.oauth2Credentials.folderUid }
              : { itemUid: preparedRequest.uid }),
            debugInfo: preparedRequest.oauth2Credentials.debugInfo
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error starting WebSocket connection:', error);
        if (error instanceof Error) {
          throw error;
        }
        sendEvent('main:ws:error', request.uid, collection.uid, { error: error.message });
        return { success: false, error: error.message };
      }
    }
  );

  // Get all active connection IDs
  ipcMain.handle('renderer:ws:get-active-connections', (event) => {
    try {
      const activeConnectionIds = wsClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });

  ipcMain.handle(
    'renderer:ws:queue-message',
    async (event, { item, collection, environment, runtimeVariables, messageContent }) => {
      try {
        const itemCopy = cloneDeep(item);
        const preparedRequest = await prepareWsRequest(itemCopy, collection, environment, runtimeVariables, {});

        // If messageContent is provided, find and queue that specific message (interpolated)
        // Otherwise, queue all messages
        if (messageContent !== undefined && messageContent !== null) {
          // Find the message index in the original request
          const originalMessages = itemCopy.draft?.request?.body?.ws || itemCopy.request?.body?.ws || [];
          const messageIndex = originalMessages.findIndex((msg) => msg.content === messageContent);

          if (messageIndex >= 0 && preparedRequest.body?.ws?.[messageIndex]) {
            // Queue the interpolated version of the specific message
            const message = preparedRequest.body.ws[messageIndex];
            wsClient.queueMessage(preparedRequest.uid, collection.uid, message.content, message.type);
          } else {
            // Message not found in request body, queue as-is (shouldn't happen in normal flow)
            wsClient.queueMessage(preparedRequest.uid, collection.uid, messageContent);
          }
        } else {
          // Queue all messages (they are already interpolated by prepareWsRequest -> interpolateVars)
          if (preparedRequest.body && preparedRequest.body.ws && Array.isArray(preparedRequest.body.ws)) {
            preparedRequest.body.ws
              .filter((message) => message && message.content)
              .forEach((message) => {
                wsClient.queueMessage(preparedRequest.uid, collection.uid, message.content, message.type);
              });
          }
        }

        return { success: true };
      } catch (error) {
        console.error('Error queuing WebSocket message:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Send a message to an existing WebSocket connection
  ipcMain.handle('renderer:ws:send-message', (event, requestId, collectionUid, message) => {
    try {
      wsClient.sendMessage(requestId, collectionUid, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return { success: false, error: error.message };
    }
  });

  // Close a WebSocket connection
  ipcMain.handle('renderer:ws:close-connection', (event, requestId, code, reason) => {
    try {
      wsClient.close(requestId, code, reason);
      return { success: true };
    } catch (error) {
      console.error('Error closing WebSocket connection:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if a WebSocket connection is active
  ipcMain.handle('renderer:ws:is-connection-active', (event, requestId) => {
    try {
      const isActive = wsClient.isConnectionActive(requestId);
      return { success: true, isActive };
    } catch (error) {
      console.error('Error checking WebSocket connection status:', error);
      return { success: false, error: error.message, isActive: false };
    }
  });

  /**
   * Get the connection status of a connection
   * @param {string} requestId - The request ID to get the connection status of
   * @returns {string} - The connection status
   */
  ipcMain.handle('renderer:ws:connection-status', (event, requestId) => {
    try {
      const status = wsClient.connectionStatus(requestId);
      return { success: true, status };
    } catch (error) {
      console.error('Error getting WebSocket connection status:', error);
      return { success: false, error: error.message, status: 'disconnected' };
    }
  });
};

module.exports = {
  registerWsEventHandlers,
  wsClient,
  prepareWsRequest
};
