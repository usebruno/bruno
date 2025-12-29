const get = require('lodash/get');
const each = require('lodash/each');
const filter = require('lodash/filter');
const find = require('lodash/find');
const decomment = require('decomment');
const fs = require('node:fs');
const { mergeHeaders, mergeScripts, mergeVars, mergeAuth, getTreePathFromCollectionToItem } = require('../utils/collection');
const path = require('node:path');
const { isLargeFile } = require('../utils/filesystem');
const { getFormattedOauth2Credentials } = require('../utils/oauth2');
const { setAuthHeaders } = require('@usebruno/requests');

const STREAMING_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const prepareRequest = async (item = {}, collection = {}) => {
  const request = item?.request;
  const brunoConfig = collection.draft?.brunoConfig ? get(collection, 'draft.brunoConfig', {}) : get(collection, 'brunoConfig', {});
  const collectionPath = collection?.pathname;
  const headers = {};
  let contentTypeDefined = false;

  const scriptFlow = brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
  }

  each(get(request, 'headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  const collectionRoot = collection?.draft?.root || collection?.root || {};

  let axiosRequest = {
    method: request.method,
    url: request.url,
    headers: headers,
    name: item.name,
    tags: item.tags || [],
    pathParams: request.params?.filter((param) => param.type === 'path'),
    settings: item.settings,
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, {
    request: { auth: request.auth },
    collectionRoot
  });

  request.body = request.body || {};

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
          // Large files can cause "JavaScript heap out of memory" errors when loaded entirely into memory.
          if (isLargeFile(filePath, STREAMING_FILE_SIZE_THRESHOLD)) {
            // For large files: Use streaming to avoid memory issues
            axiosRequest.data = fs.createReadStream(filePath);
          } else {
            // For smaller files: Use synchronous read for better performance
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
    axiosRequest.headers['content-type'] = 'multipart/form-data';
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    axiosRequest.data = enabledParams;
  }

  if (request.body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(request, 'body.graphql.query'),
      variables: JSON.parse(decomment(get(request, 'body.graphql.variables') || '{}'))
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
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
  axiosRequest.oauth2CredentialVariables = getFormattedOauth2Credentials();

  return axiosRequest;
};

module.exports = prepareRequest;
