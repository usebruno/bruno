const { get, each, filter } = require('lodash');
const decomment = require('decomment');

const prepareRequest = (request, collectionRoot) => {
  const headers = {};
  let contentTypeDefined = false;

  // collection headers
  each(get(collectionRoot, 'request.headers', []), (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  each(request.headers, (h) => {
    if (h.enabled) {
      headers[h.name] = h.value;
      if (h.name.toLowerCase() === 'content-type') {
        contentTypeDefined = true;
      }
    }
  });

  let axiosRequest = {
    method: request.method,
    url: request.url,
    headers: headers
  };

  // Authentication
  // A request can override the collection auth with another auth
  // But it cannot override the collection auth with no auth
  // We will provide support for disabling the auth via scripting in the future
  const collectionAuth = get(collectionRoot, 'request.auth');
  if (collectionAuth) {
    if (collectionAuth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(collectionAuth, 'basic.username'),
        password: get(collectionAuth, 'basic.password')
      };
    }

    if (collectionAuth.mode === 'bearer') {
      axiosRequest.headers['authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
    }
  }

  if (request.auth) {
    if (request.auth.mode === 'basic') {
      axiosRequest.auth = {
        username: get(request, 'auth.basic.username'),
        password: get(request, 'auth.basic.password')
      };
    }

    if (request.auth.mode === 'bearer') {
      axiosRequest.headers['authorization'] = `Bearer ${get(request, 'auth.bearer.token')}`;
    }
  }

  request.body = request.body || {};

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      axiosRequest.data = JSON.parse(decomment(request.body.json));
    } catch (ex) {
      axiosRequest.data = request.body.json;
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
      axiosRequest.headers['content-type'] = 'text/xml';
    }
    axiosRequest.data = request.body.xml;
  }

  if (request.body.mode === 'sparql') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/sparql-query';
    }
    axiosRequest.data = request.body.sparql;
  }

  if (request.body.mode === 'formUrlEncoded') {
    axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
    const params = {};
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    each(enabledParams, (p) => (params[p.name] = p.value));
    axiosRequest.data = params;
  }

  if (request.body.mode === 'multipartForm') {
    const params = {};
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    each(enabledParams, (p) => (params[p.name] = p.value));
    axiosRequest.headers['content-type'] = 'multipart/form-data';
    axiosRequest.data = params;
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

  if (request.script && request.script.length) {
    axiosRequest.script = request.script;
  }

  return axiosRequest;
};

module.exports = prepareRequest;
