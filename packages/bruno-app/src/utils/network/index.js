import each from 'lodash/each';
import filter from 'lodash/filter';
import qs from 'qs';
import { rawRequest, gql } from 'graphql-request';
import { sendHttpRequestInBrowser } from './browser';

const sendNetworkRequest = async (item) => {
  return new Promise((resolve, reject) => {
    if(item.type === 'http-request') {
      const timeStart = Date.now();
      sendHttpRequest(item.draft ? item.draft.request : item.request)
        .then((response) => {
          const timeEnd = Date.now();
          resolve({
            state: 'success',
            data: response.data,
            headers: Object.entries(response.headers),
            size: response.headers["content-length"] || 0,
            status: response.status,
            duration: timeEnd - timeStart
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (request) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    const headers = {};
    each(request.headers, (h) => {
      if(h.enabled) {
        headers[h.name] = h.value;
      }
    });

    let options = {
      method: request.method,
      url: request.url,
      headers: headers
    };

    if(request.body.mode === 'json') {
      options.headers['content-type'] = 'application/json';
      try {
        options.data = JSON.parse(request.body.json);
      } catch (ex) {
        options.data = request.body.json;
      }
    }

    if(request.body.mode === 'text') {
      options.headers['content-type'] = 'text/plain';
      options.data = request.body.text;
    }

    if(request.body.mode === 'xml') {
      options.headers['content-type'] = 'text/xml';
      options.data = request.body.xml;
    }

    if(request.body.mode === 'formUrlEncoded') {
      options.headers['content-type'] = 'application/x-www-form-urlencoded';
      const params = {};
      const enabledParams = filter(request.body.formUrlEncoded, p => p.enabled);
      each(enabledParams, (p) => params[p.name] = p.value);
      options.data = qs.stringify(params);
    }

    if(request.body.mode === 'multipartForm') {
      const params = {};
      const enabledParams = filter(request.body.multipartForm, p => p.enabled);
      each(enabledParams, (p) => params[p.name] = p.value);
      options.headers['content-type'] = 'multipart/form-data';
      options.data = params;
    }

    console.log('>>> Sending Request');
    console.log(options);

    // Todo: Choose based on platform (web/desktop)
    sendHttpRequestInBrowser(options)
      .then(resolve)
      .catch(reject);

    // ipcRenderer
    //   .invoke('send-http-request', options)
    //   .then(resolve)
    //   .catch(reject);
  });
};

const sendGraphqlRequest = async (request,) => {
  const query = gql`${request.request.body.graphql.query}`;

  const { data, errors, extensions, headers, status } = await rawRequest(request.request.url, query);

  return {
    data,
    headers,
    data,
    errors
  }
};

export {
  sendNetworkRequest
};
