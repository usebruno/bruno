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
      ...mapHeaders(request.headers, get(collectionRoot, 'request.headers', []), resolvedVars),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams),
    script: request.script,
    vars: request.vars
  };

  return setAuthHeaders(axiosRequest, request, collectionRoot);
};

const mapHeaders = (requestHeaders, collectionHeaders, resolvedVars) => {
  const headers = {};

  // Add collection headers first
  each(collectionHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = interpolate(h.value, resolvedVars);
    }
  });

  // Then add request headers, which will overwrite if names overlap
  each(requestHeaders, (h) => {
    if (h.enabled) {
      headers[h.name] = interpolate(h.value, resolvedVars);
    }
  });

  return headers;
};

module.exports = prepareGqlIntrospectionRequest;
