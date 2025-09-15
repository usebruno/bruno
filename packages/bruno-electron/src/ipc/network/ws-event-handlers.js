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

const setWsAuthHeaders = (wsRequest, request, collectionRoot) => {
  const collectionAuth = get(collectionRoot, 'request.auth');
  if (collectionAuth && request.auth?.mode === 'inherit') {
    if (collectionAuth.mode === 'basic') {
      wsRequest.basicAuth = {
        username: get(collectionAuth, 'basic.username'),
        password: get(collectionAuth, 'basic.password')
      };
    }

    if (collectionAuth.mode === 'bearer') {
      wsRequest.headers['Authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
    }

    if (collectionAuth.mode === 'apikey') {
      wsRequest.headers[collectionAuth.apikey?.key] = collectionAuth.apikey?.value;
    }

    if (collectionAuth.mode === 'oauth2') {
      const grantType = get(collectionAuth, 'oauth2.grantType');

      if (grantType === 'client_credentials') {
        wsRequest.oauth2 = {
          grantType,
          accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
          clientId: get(collectionAuth, 'oauth2.clientId'),
          clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
          scope: get(collectionAuth, 'oauth2.scope'),
          credentialsPlacement: get(collectionAuth, 'oauth2.credentialsPlacement'),
          tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
          tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
          tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey')
        };
      } else if (grantType === 'password') {
        wsRequest.oauth2 = {
          grantType,
          accessTokenUrl: get(collectionAuth, 'oauth2.accessTokenUrl'),
          username: get(collectionAuth, 'oauth2.username'),
          password: get(collectionAuth, 'oauth2.password'),
          clientId: get(collectionAuth, 'oauth2.clientId'),
          clientSecret: get(collectionAuth, 'oauth2.clientSecret'),
          scope: get(collectionAuth, 'oauth2.scope'),
          credentialsPlacement: get(collectionAuth, 'oauth2.credentialsPlacement'),
          tokenPlacement: get(collectionAuth, 'oauth2.tokenPlacement'),
          tokenHeaderPrefix: get(collectionAuth, 'oauth2.tokenHeaderPrefix'),
          tokenQueryKey: get(collectionAuth, 'oauth2.tokenQueryKey')
        };
      }
    }
  }

  if (request.auth && request.auth.mode !== 'inherit') {
    if (request.auth.mode === 'basic') {
      wsRequest.basicAuth = {
        username: get(request, 'auth.basic.username'),
        password: get(request, 'auth.basic.password')
      };
    }

    if (request.auth.mode === 'bearer') {
      wsRequest.headers['Authorization'] = `Bearer ${get(request, 'auth.bearer.token')}`;
    }

    if (request.auth.mode === 'apikey') {
      wsRequest.headers[get(request, 'auth.apikey.key')] = get(request, 'auth.apikey.value');
    }

    if (request.auth.mode === 'oauth2') {
      const grantType = get(request, 'auth.oauth2.grantType');

      if (grantType === 'client_credentials') {
        wsRequest.oauth2 = {
          grantType,
          clientId: get(request, 'auth.oauth2.clientId'),
          clientSecret: get(request, 'auth.oauth2.clientSecret'),
          scope: get(request, 'auth.oauth2.scope'),
          accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
          tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
          credentialsPlacement: get(request, 'auth.oauth2.credentialsPlacement'),
          tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
          tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey')
        };
      } else if (grantType === 'password') {
        wsRequest.oauth2 = {
          grantType,
          username: get(request, 'auth.oauth2.username'),
          password: get(request, 'auth.oauth2.password'),
          clientId: get(request, 'auth.oauth2.clientId'),
          clientSecret: get(request, 'auth.oauth2.clientSecret'),
          scope: get(request, 'auth.oauth2.scope'),
          accessTokenUrl: get(request, 'auth.oauth2.accessTokenUrl'),
          tokenPlacement: get(request, 'auth.oauth2.tokenPlacement'),
          credentialsPlacement: get(request, 'auth.oauth2.credentialsPlacement'),
          tokenHeaderPrefix: get(request, 'auth.oauth2.tokenHeaderPrefix'),
          tokenQueryKey: get(request, 'auth.oauth2.tokenQueryKey')
        };
      }
    }
  }

  return wsRequest;
};

const prepareWsRequest = async (item, collection, environment, runtimeVariables, certsAndProxyConfig = {}) => {
  const request = item.draft ? item.draft.request : item.request;

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars();

  let wsRequest = {
    uid: item.uid,
    url: request.url,
    headers: request.headers || [],
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

  wsRequest = setWsAuthHeaders(wsRequest, request, collection);

  if (wsRequest.oauth2) {
    let requestCopy = cloneDeep(wsRequest);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey } = {} } = requestCopy || {};
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
          certsAndProxyConfig
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
          certsAndProxyConfig
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
          certsAndProxyConfig
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

  ipcMain.handle('ws:connections-changed', (event) => {
    sendEvent('ws:connections-changed', event);
  });

  // Start a new WebSocket connection
  ipcMain.handle('ws:start-connection', async (event, { request, collection, environment, runtimeVariables,settings }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareWsRequest(requestCopy, collection, environment, runtimeVariables, {});

      const requestSent = {
        type: 'request',
        url: preparedRequest.url,
        headers: preparedRequest.headers,
        body: preparedRequest.body,
        timestamp: Date.now()
      };

      // Start WebSocket connection
      await wsClient.startConnection({
        request: preparedRequest,
        collection,
        options: {
          timeout: settings.connectionTimeout,
          keepAlive: settings.keepAliveInterval > 0 ? true : false,
          keepAliveInterval: settings.keepAliveInterval
        }
      });

      sendEvent('ws:request', preparedRequest.uid, collection.uid, requestSent);

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
      sendEvent('ws:error', request.uid, collection.uid, { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // Get all active connection IDs
  ipcMain.handle('ws:get-active-connections', (event) => {
    try {
      const activeConnectionIds = wsClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });

  // Send a message to an existing WebSocket connection
  ipcMain.handle('ws:send-message', (event, requestId, collectionUid, message) => {
    try {
      wsClient.sendMessage(requestId, collectionUid, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return { success: false, error: error.message };
    }
  });

  // Close a WebSocket connection
  ipcMain.handle('ws:close-connection', (event, requestId, code, reason) => {
    try {
      wsClient.close(requestId, code, reason);
      return { success: true };
    } catch (error) {
      console.error('Error closing WebSocket connection:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if a WebSocket connection is active
  ipcMain.handle('ws:is-connection-active', (event, requestId) => {
    try {
      const isActive = wsClient.isConnectionActive(requestId);
      return { success: true, isActive };
    } catch (error) {
      console.error('Error checking WebSocket connection status:', error);
      return { success: false, error: error.message, isActive: false };
    }
  });
};

module.exports = {
  registerWsEventHandlers,
  wsClient
};
