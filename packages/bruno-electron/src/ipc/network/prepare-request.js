const { get, each, filter, find } = require('lodash');
const decomment = require('decomment');
const fs = require('node:fs');
const { getTreePathFromCollectionToItem, mergeHeaders, mergeScripts, mergeVars, getFormattedCollectionOauth2Credentials, mergeAuth } = require('../../utils/collection');
const path = require('node:path');
const { isLargeFile } = require('../../utils/filesystem');
const { setAuthHeaders } = require('@usebruno/requests');

const STREAMING_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const prepareRequest = async (item, collection = {}, abortController) => {
  const request = item.draft ? item.draft.request : item.request;
  const settings = item.draft?.settings ?? item.settings;
  const collectionRoot = collection?.draft?.root ? get(collection, 'draft.root', {}) : get(collection, 'root', {});
  const collectionPath = collection?.pathname;
  const headers = {};
  let contentTypeDefined = false;
  let url = request.url;

  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled && h.name?.toLowerCase() === 'content-type') {
      contentTypeDefined = true;
      return false;
    }
  });

  const scriptFlow = collection?.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection?.oauth2Credentials });
    request.promptVariables = collection?.promptVariables || {};
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled && h.name.length > 0) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  let axiosRequest = {
    mode: request.body.mode,
    method: request.method,
    url,
    headers,
    name: item.name,
    tags: item.tags || [],
    pathParams: request.params?.filter((param) => param.type === 'path'),
    settings,
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, {
    request: { auth: request.auth },
    collectionRoot
  });

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      axiosRequest.data = decomment(request?.body?.json);
    } catch (error) {
      axiosRequest.data = request?.body?.json;
    }
  }

  if (request.body.mode === 'text') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'text/plain';
    }
    axiosRequest.data = request.body.text;
  }

  if (request.body.mode === 'xml') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/xml';
    }
    axiosRequest.data = request.body.xml;
  }

  if (request.body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = request.body.sparql;
  }

  if (request.body.mode === 'file') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/octet-stream';
    }

    const bodyFile = find(request.body.file, (param) => param.selected);
    if (bodyFile) {
      let { filePath, contentType } = bodyFile;

      axiosRequest.headers['content-type'] = contentType;
      if (filePath) {
        if (!path.isAbsolute(filePath)) {
          filePath = path.join(collectionPath, filePath);
        }

        try {
          if (isLargeFile(filePath, STREAMING_FILE_SIZE_THRESHOLD)) {
            axiosRequest.data = fs.createReadStream(filePath);
          } else {
            axiosRequest.data = fs.readFileSync(filePath);
          }
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
    }
  }

  if (request.body.mode === 'formUrlEncoded') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (request.body.mode === 'multipartForm') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'multipart/form-data';
    }
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (request.body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(request, 'body.graphql.query'),
      variables: decomment(get(request, 'body.graphql.variables') || '{}')
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
  }

  if (request.body.mode === 'none' && request.auth.mode !== 'awsv4') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = false;
    }
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  if (request.tests) {
    axiosRequest.tests = request.tests;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.collectionVariables = request.collectionVariables;
  axiosRequest.folderVariables = request.folderVariables;
  axiosRequest.requestVariables = request.requestVariables;
  axiosRequest.promptVariables = request.promptVariables;
  axiosRequest.globalEnvironmentVariables = request.globalEnvironmentVariables;
  axiosRequest.oauth2CredentialVariables = request.oauth2CredentialVariables;
  axiosRequest.assertions = request.assertions;
  axiosRequest.oauth2Credentials = request.oauth2Credentials;

  return axiosRequest;
};

module.exports = {
  prepareRequest,
  setAuthHeaders
};
