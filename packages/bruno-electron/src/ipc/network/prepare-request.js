const { get, each, filter, forOwn, extend, reduce } = require('lodash');
const decomment = require('decomment');
const FormData = require('form-data');

// Authentication
// A request can override the collection auth with another auth
// But it cannot override the collection auth with no auth
// We will provide support for disabling the auth via scripting in the future
const setAuthHeaders = (axiosRequest, request, collectionRoot) => {
  const collectionAuth = get(collectionRoot, 'request.auth');
  if (collectionAuth) {
    switch (collectionAuth.mode) {
      case 'awsv4':
        axiosRequest.awsv4config = {
          accessKeyId: get(collectionAuth, 'awsv4.accessKeyId'),
          secretAccessKey: get(collectionAuth, 'awsv4.secretAccessKey'),
          sessionToken: get(collectionAuth, 'awsv4.sessionToken'),
          service: get(collectionAuth, 'awsv4.service'),
          region: get(collectionAuth, 'awsv4.region'),
          profileName: get(collectionAuth, 'awsv4.profileName')
        };
        break;
      case 'basic':
        axiosRequest.auth = {
          username: get(collectionAuth, 'basic.username'),
          password: get(collectionAuth, 'basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['authorization'] = `Bearer ${get(collectionAuth, 'bearer.token')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(collectionAuth, 'digest.username'),
          password: get(collectionAuth, 'digest.password')
        };
        break;
    }
  }

  if (request.auth) {
    switch (request.auth.mode) {
      case 'awsv4':
        axiosRequest.awsv4config = {
          accessKeyId: get(request, 'auth.awsv4.accessKeyId'),
          secretAccessKey: get(request, 'auth.awsv4.secretAccessKey'),
          sessionToken: get(request, 'auth.awsv4.sessionToken'),
          service: get(request, 'auth.awsv4.service'),
          region: get(request, 'auth.awsv4.region'),
          profileName: get(request, 'auth.awsv4.profileName')
        };
        break;
      case 'basic':
        axiosRequest.auth = {
          username: get(request, 'auth.basic.username'),
          password: get(request, 'auth.basic.password')
        };
        break;
      case 'bearer':
        axiosRequest.headers['authorization'] = `Bearer ${get(request, 'auth.bearer.token')}`;
        break;
      case 'digest':
        axiosRequest.digestConfig = {
          username: get(request, 'auth.digest.username'),
          password: get(request, 'auth.digest.password')
        };
    }
  }

  return axiosRequest;
};

/**
 *
 * @param {object} requestObj the request body obj
 * @returns {object} Returns an obj with repeating key as a array of values
 * {item: 2, item: 3, item1: 4} becomes {item: [2,3], item1: 4}
 */
const createPayload = (requestObj) => {
  const res = reduce(
    requestObj,
    (acc, p) => {
      if (!acc[p.name]) {
        acc[p.name] = p.value;
        return acc;
      }

      const oldVal = acc[p.name];
      acc[p.name] = [oldVal];
      acc[p.name].push(p.value);
      return acc;
    },
    {}
  );
  return res;
};

const prepareRequest = (request, collectionRoot) => {
  const headers = {};
  let contentTypeDefined = false;
  let url = request.url;

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
    mode: request.body.mode,
    method: request.method,
    url,
    headers,
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, request, collectionRoot);

  if (request.body.mode === 'json') {
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    try {
      // axiosRequest.data = JSON.parse(request.body.json);
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
    const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
    const params = createPayload(enabledParams);
    axiosRequest.data = params;
  }

  if (request.body.mode === 'multipartForm') {
    const enabledParams = filter(request.body.multipartForm, (p) => p.enabled);
    const params = createPayload(enabledParams);
    axiosRequest.headers['content-type'] = 'multipart/form-data';
    axiosRequest.data = params;

    // make axios work in node using form data
    // reference: https://github.com/axios/axios/issues/1006#issuecomment-320165427
    const form = new FormData();
    forOwn(axiosRequest.data, (value, key) => {
      form.append(key, value);
    });
    extend(axiosRequest.headers, form.getHeaders());
    axiosRequest.data = form;
  }

  if (request.body.mode === 'graphql') {
    const graphqlQuery = {
      query: get(request, 'body.graphql.query'),
      // https://github.com/usebruno/bruno/issues/884 - we must only parse the variables after the variable interpolation
      variables: decomment(get(request, 'body.graphql.variables') || '{}')
    };
    if (!contentTypeDefined) {
      axiosRequest.headers['content-type'] = 'application/json';
    }
    axiosRequest.data = graphqlQuery;
  }

  if (request.script) {
    axiosRequest.script = request.script;
  }

  axiosRequest.vars = request.vars;
  axiosRequest.assertions = request.assertions;

  return axiosRequest;
};

module.exports = prepareRequest;
module.exports.setAuthHeaders = setAuthHeaders;
