import { safeStringifyJSON } from 'utils/common';

export const sendNetworkRequest = async (item, collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, collectionVariables)
        .then((response) => {
          resolve({
            state: 'success',
            data: response.data,
            headers: Object.entries(response.headers),
            size: getResponseSize(response),
            status: response.status,
            statusText: response.statusText,
            duration: response.duration
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
      .invoke('send-http-request', item, collection, environment, collectionVariables)
      .then(resolve)
      .catch(reject);
  });
};

const getResponseSize = (response) => {
  return response.headers['content-length'] || Buffer.byteLength(safeStringifyJSON(response.data)) || 0;
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
