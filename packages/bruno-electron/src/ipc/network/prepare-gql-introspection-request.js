const { get, each } = require('lodash');
const { interpolate } = require('@usebruno/common');
const { getIntrospectionQuery } = require('graphql');
const { setAuthHeaders } = require('./prepare-request');

const prepareGqlIntrospectionRequest = (endpoint, resolvedVars, request, collectionRoot) => {
  if (endpoint && endpoint.length) {
    endpoint = interpolate(endpoint, resolvedVars);
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

  return setAuthHeaders(axiosRequest, request, collectionRoot);
};

const mapHeaders = (requestHeaders, collectionHeaders) => {
  const headers = {};

  // Add collection headers first
  each(collectionHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  // Then add request headers, which will overwrite if names overlap
  each(requestHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
    }
  });

  return headers;
};

module.exports = prepareGqlIntrospectionRequest;
