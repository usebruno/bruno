import { safeStringifyJSON } from 'utils/common';

export const sendNetworkRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, runtimeVariables)
        .then((response) => {
          resolve({
            state: 'success',
            data: response.data,
            // Note that the Buffer is encoded as a base64 string, because Buffers / TypedArrays are not allowed in the redux store
            dataBuffer: response.dataBuffer,
            headers: response.headers,
            size: response.size,
            status: response.status,
            statusText: response.statusText,
            duration: response.duration
          });
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('send-http-request', item, collection, environment, runtimeVariables)
      .then(resolve)
      .catch(reject);
  });
};

export const sendCollectionOauth2Request = async (collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('send-collection-oauth2-request', collection, environment, runtimeVariables)
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

export const fetchGqlSchema = async (environment, request, collection, item) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('fetch-gql-schema', environment, request, collection, item).then(resolve).catch(reject);
  });
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('cancel-http-request', cancelTokenUid).then(resolve).catch(reject);
  });
};
