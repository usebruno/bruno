import get from 'lodash/get';
import each from 'lodash/each';
import filter from 'lodash/filter';
import qs from 'qs';

export const sendNetworkRequest = async (item, options, onRequestSent) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      const timeStart = Date.now();
      sendHttpRequest(item.draft ? item.draft.request : item.request, options, onRequestSent)
        .then((response) => {
          const timeEnd = Date.now();
          resolve({
            state: 'success',
            data: response.data,
            headers: Object.entries(response.headers),
            size: response.headers['content-length'] || 0,
            status: response.status,
            statusText: response.statusText,
            duration: timeEnd - timeStart
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (request, options, onRequestSent) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    const headers = {};
    each(request.headers, (h) => {
      if (h.enabled) {
        headers[h.name] = h.value;
      }
    });

    let axiosRequest = {
      method: request.method,
      url: request.url,
      headers: headers
    };

    if (request.body.mode === 'json') {
      axiosRequest.headers['content-type'] = 'application/json';
      try {
        axiosRequest.data = JSON.parse(request.body.json);
      } catch (ex) {
        axiosRequest.data = request.body.json;
      }
    }

    if (request.body.mode === 'text') {
      axiosRequest.headers['content-type'] = 'text/plain';
      axiosRequest.data = request.body.text;
    }

    if (request.body.mode === 'xml') {
      axiosRequest.headers['content-type'] = 'text/xml';
      axiosRequest.data = request.body.xml;
    }

    if (request.body.mode === 'formUrlEncoded') {
      axiosRequest.headers['content-type'] = 'application/x-www-form-urlencoded';
      const params = {};
      const enabledParams = filter(request.body.formUrlEncoded, (p) => p.enabled);
      each(enabledParams, (p) => (params[p.name] = p.value));
      axiosRequest.data = qs.stringify(params);
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
        variables: JSON.parse(get(request, 'body.graphql.variables') || '{}')
      };
      axiosRequest.headers['content-type'] = 'application/json';
      axiosRequest.data = graphqlQuery;
    }

    if (request.script && request.script.length) {
      axiosRequest.script = request.script;
    }
    console.log(axiosRequest);

    onRequestSent(axiosRequest);

    ipcRenderer
      .invoke('send-http-request', axiosRequest, options)
      .then(resolve)
      .catch(reject);
  });
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke('cancel-http-request', cancelTokenUid)
      .then(resolve)
      .catch(reject);
  });
};
