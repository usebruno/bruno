import { safeStringifyJSON } from 'utils/common';

export const sendNetworkRequest = async (item, collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, collectionVariables)
        .then((response) => {
          resolve({
            state: 'success',
            headers: response.headers,
            size: response.size,
            status: response.status,
            statusText: response.statusText,
            duration: response.duration,
            isNew: response.isNew ?? false,
            timeline: response.timeline,
            debug: response.debug
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (item, collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke(
        'send-http-request',
        item,
        collection,
        environment,
        collectionVariables,
        localStorage.getItem('new-request') === '"true"'
      )
      .then(resolve)
      .catch(reject);
  });
};

export const getResponseBody = async (requestId) => {
  return await window.ipcRenderer.invoke('renderer:get-response-body', requestId);
};

export const sendCollectionOauth2Request = async (collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('send-collection-oauth2-request', collection, environment, collectionVariables)
      .then(resolve)
      .catch(reject);
  });
};

export const clearOauth2Cache = async (uid) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('clear-oauth2-cache', uid).then(resolve).catch(reject);
  });
};

export const fetchGqlSchema = async (endpoint, environment, request, collection) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('fetch-gql-schema', endpoint, environment, request, collection).then(resolve).catch(reject);
  });
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('cancel-http-request', cancelTokenUid).then(resolve).catch(reject);
  });
};
