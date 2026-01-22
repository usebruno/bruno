const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, mergeAuth, getFormattedCollectionOauth2Credentials } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const { getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingAuthorizationCode } = require('../../utils/oauth2');
const { setAuthHeaders } = require('./prepare-request');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { interpolateString } = require('./interpolate-string');

const processHeaders = (headers) => {
  Object.entries(headers).forEach(([key, value]) => {
    if (key?.toLowerCase().endsWith('-bin')) {
      headers[key] = Buffer.from(value, 'base64');
    }
  });
};

const placeOAuth2Token = (grpcRequest, credentials, tokenPlacement, tokenHeaderPrefix, tokenQueryKey) => {
  if (tokenPlacement === 'header') {
    grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
  } else {
    try {
      const url = new URL(grpcRequest.url);
      url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
      grpcRequest.url = url?.toString();
    } catch (error) {
      console.error('Failed to parse URL for OAuth2 token placement:', error);
    }
  }
};

const configureRequest = async (grpcRequest, request, collection, envVars, runtimeVariables, processEnvVars, promptVariables, certsAndProxyConfig) => {
  if (grpcRequest.oauth2) {
    let requestCopy = cloneDeep(grpcRequest);
    const { uid: collectionUid, pathname: collectionPath, globalEnvironmentVariables } = collection;
    const { oauth2: { grantType, tokenPlacement, tokenHeaderPrefix, tokenQueryKey, accessTokenUrl, refreshTokenUrl } = {}, collectionVariables, folderVariables, requestVariables } = requestCopy || {};
    let credentials, credentialsId, oauth2Url, debugInfo;

    // Get cert/proxy configs for token and refresh URLs
    let certsAndProxyConfigForTokenUrl = certsAndProxyConfig;
    let certsAndProxyConfigForRefreshUrl = certsAndProxyConfig;

    if (accessTokenUrl && grantType !== 'implicit') {
      const interpolatedTokenUrl = interpolateString(accessTokenUrl, {
        globalEnvironmentVariables,
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
        collectionUid,
        collection,
        request: tokenRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        globalEnvironmentVariables
      });
    }

    const tokenUrlForRefresh = refreshTokenUrl || accessTokenUrl;
    if (tokenUrlForRefresh && grantType !== 'implicit') {
      const interpolatedRefreshUrl = interpolateString(tokenUrlForRefresh, {
        globalEnvironmentVariables,
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
        collectionUid,
        collection,
        request: refreshRequestForConfig,
        envVars,
        runtimeVariables,
        processEnvVars,
        collectionPath,
        globalEnvironmentVariables
      });
    }

    try {
      switch (grantType) {
        case 'authorization_code':
          interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
          ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingAuthorizationCode({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
          grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
          placeOAuth2Token(grpcRequest, credentials, tokenPlacement, tokenHeaderPrefix, tokenQueryKey);
          break;
        case 'client_credentials':
          interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
          ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingClientCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
          grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
          placeOAuth2Token(grpcRequest, credentials, tokenPlacement, tokenHeaderPrefix, tokenQueryKey);
          break;
        case 'password':
          interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);
          ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingPasswordCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfigForTokenUrl, certsAndProxyConfigForRefreshUrl }));
          grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
          placeOAuth2Token(grpcRequest, credentials, tokenPlacement, tokenHeaderPrefix, tokenQueryKey);
          break;
      }
    } catch (error) {
      console.error('Failed to configure OAuth2 request:', error);
      throw error;
    }
  }
};

const prepareGrpcRequest = async (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft?.root ? get(collection, 'draft.root', {}) : get(collection, 'root', {});
  const headers = {};
  const url = request.url;
  const { promptVariables = {} } = collection;

  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeAuth(collection, request, requestTreePath);
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
    request.promptVariables = promptVariables;
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled && h.name.length > 0) {
      headers[h.name] = h.value;
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
    promptVariables,
    body: request.body,
    protoPath: request.protoPath,
    // Add variable properties for interpolation
    vars: request.vars,
    collectionVariables: request.collectionVariables,
    folderVariables: request.folderVariables,
    requestVariables: request.requestVariables,
    globalEnvironmentVariables: request.globalEnvironmentVariables,
    oauth2CredentialVariables: request.oauth2CredentialVariables
  };

  grpcRequest = setAuthHeaders(grpcRequest, request, collectionRoot);

  interpolateVars(grpcRequest, envVars, runtimeVariables, processEnvVars, promptVariables);
  processHeaders(grpcRequest.headers);

  return grpcRequest;
};

module.exports = prepareGrpcRequest;
module.exports.configureRequest = configureRequest;
