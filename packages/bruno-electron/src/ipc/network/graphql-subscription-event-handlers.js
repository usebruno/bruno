const { ipcMain, app } = require('electron');
const { GraphQLSubscriptionClient } = require('@usebruno/requests');
const { cloneDeep, each, get } = require('lodash');
const decomment = require('decomment');
const { parse, getIntrospectionQuery } = require('graphql');
const interpolateVars = require('./interpolate-vars');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const {
  getEnvVars,
  getTreePathFromCollectionToItem,
  mergeHeaders,
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
const { setAuthHeaders } = require('./prepare-request');

const SEC_WEBSOCKET_PROTOCOL_HEADER = 'sec-websocket-protocol';

// Infers the operation name from the parsed query. A parse failure — or a
// query whose selected operation isn't a subscription — must never block the
// request: the server is the authority, and a client has to be able to send a
// deliberately malformed query and show the server's 4400.
const resolveOperation = (query) => {
  try {
    const document = parse(query);
    const operationDefinitions = document.definitions.filter((d) => d.kind === 'OperationDefinition');
    const operationName = operationDefinitions[0]?.name?.value;
    const operation = operationDefinitions[0]?.operation;

    const warning = operation && operation !== 'subscription'
      ? `Query's operation type is "${operation}", not "subscription"`
      : null;

    return { operationName: operationName || undefined, warning };
  } catch (error) {
    return { operationName: undefined, warning: null };
  }
};

const prepareGraphQLSubscriptionRequest = async (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft?.root ? get(collection, 'draft.root', {}) : get(collection, 'root', {});
  const rawHeaders = cloneDeep(request.headers ?? []);
  const headers = {};

  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({
      oauth2Credentials: collection?.oauth2Credentials
    });
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  // The client owns graphql-transport-ws subprotocol negotiation — a header
  // authored for a different transport (e.g. copied from a ws-request) must
  // not override it.
  const droppedProtocolHeader = rawHeaders.find(
    (h) => h.enabled && h.name && h.name.toLowerCase() === SEC_WEBSOCKET_PROTOCOL_HEADER
  );
  if (droppedProtocolHeader) {
    console.warn(`Ignoring "${droppedProtocolHeader.name}" header — the subscription client negotiates its own subprotocol.`);
  }
  Object.keys(headers).forEach((name) => {
    if (name.toLowerCase() === SEC_WEBSOCKET_PROTOCOL_HEADER) {
      delete headers[name];
    }
  });

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars(collection.uid);
  const { promptVariables = {} } = collection;

  let preparedRequest = {
    uid: item.uid,
    mode: 'graphql',
    url: request.url,
    headers,
    processEnvVars,
    envVars,
    runtimeVariables,
    data: {
      query: get(request, 'body.graphql.query', ''),
      variables: get(request, 'body.graphql.variables', ''),
      connectionParams: request.connectionParams || ''
    },
    collectionVariables: request.collectionVariables,
    folderVariables: request.folderVariables,
    requestVariables: request.requestVariables,
    globalEnvironmentVariables: request.globalEnvironmentVariables,
    oauth2CredentialVariables: request.oauth2CredentialVariables
  };

  preparedRequest = setAuthHeaders(preparedRequest, request, collectionRoot);

  if (preparedRequest.oauth2) {
    const requestCopy = cloneDeep(preparedRequest);
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey } = {} } = requestCopy;

    let credentials, credentialsId, oauth2Url, debugInfo;
    let tokenFetcher;
    switch (grantType) {
      case 'authorization_code':
        tokenFetcher = getOAuth2TokenUsingAuthorizationCode;
        break;
      case 'client_credentials':
        tokenFetcher = getOAuth2TokenUsingClientCredentials;
        break;
      case 'password':
        tokenFetcher = getOAuth2TokenUsingPasswordCredentials;
        break;
    }

    if (tokenFetcher) {
      interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
      ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await tokenFetcher({
        request: requestCopy,
        collectionUid: collection.uid
      }));
      preparedRequest.oauth2Credentials = {
        credentials,
        url: oauth2Url,
        collectionUid: collection.uid,
        credentialsId,
        debugInfo,
        folderUid: request.oauth2Credentials?.folderUid
      };
      if (tokenPlacement === 'header') {
        preparedRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
      } else {
        try {
          const url = new URL(preparedRequest.url);
          url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
          preparedRequest.url = url?.toString();
        } catch (error) {}
      }
    }
  }

  // Add API key to the URL if placement is queryparams
  if (preparedRequest.apiKeyAuthValueForQueryParams && preparedRequest.apiKeyAuthValueForQueryParams.placement === 'queryparams') {
    try {
      const urlObj = new URL(preparedRequest.url);
      const interpolationOptions = {
        globalEnvironmentVariables: request.globalEnvironmentVariables,
        envVars,
        runtimeVariables,
        promptVariables,
        processEnvVars
      };

      const key = interpolateString(preparedRequest.apiKeyAuthValueForQueryParams.key, interpolationOptions);
      const value = interpolateString(preparedRequest.apiKeyAuthValueForQueryParams.value, interpolationOptions);

      urlObj.searchParams.set(key, value);
      preparedRequest.url = urlObj.toString();
    } catch (error) {
      console.error('Error adding API key to the subscription URL:', error);
    }
  }
  delete preparedRequest.apiKeyAuthValueForQueryParams;

  // Interpolate query/variables/connectionParams (still strings) before parsing —
  // this is why `{"Authorization": "Bearer {{token}}"}` works at all.
  // https://github.com/usebruno/bruno/issues/884
  interpolateVars(preparedRequest, envVars, runtimeVariables, processEnvVars, promptVariables);

  const rawVariables = preparedRequest.data.variables;
  try {
    preparedRequest.data.variables = rawVariables ? JSON.parse(decomment(rawVariables)) : {};
  } catch (error) {
    throw new Error(`Failed to parse GraphQL variables: ${error.message}`);
  }

  const rawConnectionParams = preparedRequest.data.connectionParams;
  try {
    preparedRequest.connectionParams = rawConnectionParams ? JSON.parse(decomment(rawConnectionParams)) : undefined;
  } catch (error) {
    throw new Error(`Failed to parse connection params: ${error.message}`);
  }

  const { operationName, warning } = resolveOperation(preparedRequest.data.query);
  preparedRequest.operationName = operationName;
  preparedRequest.warning = warning;

  return preparedRequest;
};

const INTROSPECTION_TIMEOUT_MS = 15_000;

/**
 * Runs a GraphQL introspection query over the subscription endpoint itself —
 * `graphql-transport-ws` is not subscription-only, a `subscribe` message
 * carrying any query yields one `next` then `complete`. Uses a short-lived,
 * throwaway client (not the shared one used for real subscriptions) so this
 * never touches — or is visible in — the tab's own connection/response state.
 */
const introspectGraphQLSubscriptionSchema = (preparedRequest, tlsOptions) => {
  const requestId = `${preparedRequest.uid}:introspection`;
  let settled = false;
  let client;
  let timeoutHandle;

  return new Promise((resolve, reject) => {
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      client.disconnect(requestId, 1000, 'Introspection complete');
      fn(value);
    };

    client = new GraphQLSubscriptionClient((channel, ...args) => {
      if (channel === 'main:gql-sub:operation-state') {
        const [, , { states }] = args;
        (states || []).forEach((state) => {
          if (state.type === 'next') {
            settle(resolve, state.payload?.data);
          } else if (state.type === 'error') {
            settle(reject, new Error(state.errors?.[0]?.message || 'Introspection query failed'));
          }
        });
      } else if (channel === 'main:gql-sub:error') {
        const [, , { error }] = args;
        settle(reject, new Error(error || 'Introspection connection failed'));
      }
    });

    timeoutHandle = setTimeout(() => {
      settle(reject, new Error('Introspection query timed out'));
    }, INTROSPECTION_TIMEOUT_MS);

    try {
      client.connect({
        request: { ...preparedRequest, uid: requestId },
        collection: { uid: 'introspection' },
        options: { tls: tlsOptions }
      });
      client.subscribe(requestId, {
        query: getIntrospectionQuery(),
        operationName: 'IntrospectionQuery'
      });
    } catch (error) {
      settle(reject, error);
    }
  });
};

// Creating the client at module level so it can be accessed from window-all-closed/before-quit
let graphqlSubscriptionClient;

/**
 * Register IPC handlers for GraphQL subscriptions
 */
const registerGraphQLSubscriptionEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  graphqlSubscriptionClient = new GraphQLSubscriptionClient(sendEvent);

  if (app && typeof app.on === 'function') {
    const teardown = () => {
      if (graphqlSubscriptionClient && typeof graphqlSubscriptionClient.clearAllConnections === 'function') {
        try {
          graphqlSubscriptionClient.clearAllConnections();
        } catch (error) {
          console.error('Error clearing GraphQL subscription connections:', error);
        }
      }
    };
    // Both hooks are needed — on macOS window-all-closed does not quit the
    // app, and a live socket keeps the event loop (and app) alive regardless.
    app.on('window-all-closed', teardown);
    app.on('before-quit', teardown);
  }

  ipcMain.handle(
    'renderer:gql-sub:connect',
    async (event, { item, collection, environment, runtimeVariables, settings = {} }) => {
      try {
        const itemCopy = cloneDeep(item);
        const preparedRequest = await prepareGraphQLSubscriptionRequest(itemCopy, collection, environment, runtimeVariables);

        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid: collection.uid,
          collection,
          request: itemCopy.request,
          envVars: preparedRequest.envVars,
          runtimeVariables,
          processEnvVars: preparedRequest.processEnvVars,
          collectionPath: collection.pathname,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        });

        const { httpsAgentRequestFields } = certsAndProxyConfig;

        await graphqlSubscriptionClient.connect({
          request: preparedRequest,
          collection,
          options: {
            ackTimeout: settings.timeout > 0 ? settings.timeout : undefined,
            tls: {
              rejectUnauthorized: preferencesUtil.shouldVerifyTls(),
              ca: httpsAgentRequestFields.ca,
              cert: httpsAgentRequestFields.cert,
              key: httpsAgentRequestFields.key,
              pfx: httpsAgentRequestFields.pfx,
              passphrase: httpsAgentRequestFields.passphrase
            }
          }
        });

        sendEvent('main:gql-sub:request', preparedRequest.uid, collection.uid, {
          type: 'request',
          url: preparedRequest.url,
          headers: preparedRequest.headers,
          query: preparedRequest.data.query,
          variables: preparedRequest.data.variables,
          operationName: preparedRequest.operationName,
          warning: preparedRequest.warning,
          timestamp: Date.now()
        });

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
        console.error('Error connecting GraphQL subscription:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    'renderer:gql-sub:subscribe',
    async (event, { item, collection, environment, runtimeVariables }) => {
      try {
        const itemCopy = cloneDeep(item);
        const preparedRequest = await prepareGraphQLSubscriptionRequest(itemCopy, collection, environment, runtimeVariables);

        graphqlSubscriptionClient.subscribe(preparedRequest.uid, {
          query: preparedRequest.data.query,
          operationName: preparedRequest.operationName,
          variables: preparedRequest.data.variables && Object.keys(preparedRequest.data.variables).length
            ? preparedRequest.data.variables
            : undefined
        });

        return { success: true };
      } catch (error) {
        console.error('Error subscribing to GraphQL subscription:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle(
    'renderer:gql-sub:introspect',
    async (event, { item, collection, environment, runtimeVariables }) => {
      try {
        const itemCopy = cloneDeep(item);
        const preparedRequest = await prepareGraphQLSubscriptionRequest(itemCopy, collection, environment, runtimeVariables);

        const certsAndProxyConfig = await getCertsAndProxyConfig({
          collectionUid: collection.uid,
          collection,
          request: itemCopy.request,
          envVars: preparedRequest.envVars,
          runtimeVariables,
          processEnvVars: preparedRequest.processEnvVars,
          collectionPath: collection.pathname,
          globalEnvironmentVariables: collection.globalEnvironmentVariables
        });
        const { httpsAgentRequestFields } = certsAndProxyConfig;

        const data = await introspectGraphQLSubscriptionSchema(preparedRequest, {
          rejectUnauthorized: preferencesUtil.shouldVerifyTls(),
          ca: httpsAgentRequestFields.ca,
          cert: httpsAgentRequestFields.cert,
          key: httpsAgentRequestFields.key,
          pfx: httpsAgentRequestFields.pfx,
          passphrase: httpsAgentRequestFields.passphrase
        });

        return { success: true, data };
      } catch (error) {
        console.error('Error running introspection over the subscription socket:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('renderer:gql-sub:unsubscribe', (event, requestId) => {
    try {
      graphqlSubscriptionClient.unsubscribe(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from GraphQL subscription:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:gql-sub:disconnect', (event, requestId, code, reason) => {
    try {
      graphqlSubscriptionClient.disconnect(requestId, code, reason);
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting GraphQL subscription:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('renderer:gql-sub:connection-status', (event, requestId) => {
    try {
      const status = graphqlSubscriptionClient.connectionStatus(requestId);
      return { success: true, status };
    } catch (error) {
      console.error('Error getting GraphQL subscription connection status:', error);
      return { success: false, error: error.message, status: 'disconnected' };
    }
  });

  ipcMain.handle('renderer:gql-sub:get-active-connections', (event) => {
    try {
      const activeConnectionIds = graphqlSubscriptionClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active GraphQL subscription connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });
};

// A getter, not the instance — mirrors the fix applied to ws-event-handlers.js:
// exporting the raw (module-scoped, initially undefined) binding by value would
// capture `undefined` at require-time, making closeForCollection unreachable.
const getGraphQLSubscriptionClient = () => graphqlSubscriptionClient;

module.exports = {
  registerGraphQLSubscriptionEventHandlers,
  getGraphQLSubscriptionClient,
  prepareGraphQLSubscriptionRequest
};
