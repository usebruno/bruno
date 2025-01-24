const { get, each } = require('lodash');
const { interpolate } = require('@usebruno/common');
const { getIntrospectionQuery } = require('graphql');
const { setAuthHeaders } = require('./prepare-request');
const { getTreePathFromCollectionToItem, mergeScripts } = require('../../utils/collection');

const prepareGqlIntrospectionRequest = (envVars, request, collection, item) => {
  let endpoint = item.draft ? get(item, 'draft.request.url', '') : get(item, 'request.url', '');
  const collectionRoot = get(collection, 'root', {});
  const scriptFlow = collection.brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);

  mergeScripts(collection, request, requestTreePath, scriptFlow);

  if (endpoint && endpoint.length) {
    endpoint = interpolate(endpoint, envVars);
  }

  const queryParams = {
    query: getIntrospectionQuery()
  };

  let axiosRequest = {
    method: 'POST',
    url: endpoint,
    headers: {
      ...mapHeaders(request.headers, get(collectionRoot, 'request.headers', [])),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams)
  };

  axiosRequest = setAuthHeaders(axiosRequest, request, collectionRoot)

  if(request?.script){
    axiosRequest.script = request?.script;
  }

  if(request?.tests){
    axiosRequest.tests = request?.tests;
  }

  return axiosRequest;
};

const mapHeaders = (requestHeaders, collectionHeaders) => {
  const headers = {};

  each(requestHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  // collection headers
  each(collectionHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  return headers;
};

module.exports = prepareGqlIntrospectionRequest;
