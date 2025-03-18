const { get, each } = require('lodash');
const { setAuthHeaders } = require('./prepare-request');

const prepareCollectionRequest = (request, collection) => {
  const collectionRoot = get(collection, 'root', {});
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
    mode: request?.body?.mode,
    method: request.method,
    url,
    headers,
    responseType: 'arraybuffer'
  };

  axiosRequest = setAuthHeaders(axiosRequest, request, collectionRoot);
  
  axiosRequest.globalEnvironmentVariables = collection?.globalEnvironmentVariables;

  if (request.script) {
    axiosRequest.script = request.script;
  }

  axiosRequest.vars = request.vars;

  axiosRequest.method = 'POST';

  return axiosRequest;
};

module.exports = prepareCollectionRequest;
