const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { getEnvVars, getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, mergeAuth, getFormattedCollectionOauth2Credentials } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const { getOAuth2TokenUsingPasswordCredentials, getOAuth2TokenUsingClientCredentials, getOAuth2TokenUsingAuthorizationCode } = require('../../utils/oauth2');
const { setAuthHeaders } = require('./prepare-request');
const { sanitizeGrpcHeaderValue } = require('./grpc-header-utils');

const prepareGrpcRequest = async (item, collection, environment, runtimeVariables, certsAndProxyConfig = {}) => {
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
      headers[h.name] = sanitizeGrpcHeaderValue(h.name, h.value);
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
    oauth2CredentialVariables: request.oauth2CredentialVariables
  };

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
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) { }
        }
        break;
      case 'client_credentials':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingClientCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfig }));
        grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) { }
        }
        break;
      case 'password':
        interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars);
        ({ credentials, url: oauth2Url, credentialsId, debugInfo } = await getOAuth2TokenUsingPasswordCredentials({ request: requestCopy, collectionUid: collection.uid, certsAndProxyConfig }));
        grpcRequest.oauth2Credentials = { credentials, url: oauth2Url, collectionUid: collection.uid, credentialsId, debugInfo, folderUid: request.oauth2Credentials?.folderUid };
        if (tokenPlacement == 'header') {
          grpcRequest.headers['Authorization'] = `${tokenHeaderPrefix} ${credentials?.access_token}`;
        } else {
          try {
            const url = new URL(request.url);
            url?.searchParams?.set(tokenQueryKey, credentials?.access_token);
            request.url = url?.toString();
          } catch (error) { }
        }
        break;
    }
  }

  interpolateVars(grpcRequest, envVars, runtimeVariables, processEnvVars);

  return grpcRequest;
};

module.exports = prepareGrpcRequest;
