import { safeStringifyJSON } from 'utils/common';
import { uuid } from 'utils/common/index';

export const sendNetworkRequest = async (item, collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, collectionVariables)
        .then((response) => {
          resolve({
            state: 'success',
            data: response.data,
            // Note that the Buffer is encoded as a base64 string, because Buffers / TypedArrays are not allowed in the redux store
            dataBuffer: response.dataBuffer,
            headers: Object.entries(response.headers),
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

const sendHttpRequest = async (item, collection, environment, collectionVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    // Apply the cookies from the collection
    const cookies = collection.cookies ?? {};
    /** @type {Array} */
    const headers = item.draft?.request?.headers ?? item.request?.headers;
    const cookiesHeader = headers?.find((header) => header.name.toLowerCase() === 'cookie');

    if (cookiesHeader != null) {
      cookiesHeader.value = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    } else if (Object.keys(cookies).length > 0) {
      headers.push({
        uid: uuid(),
        name: 'Cookie',
        value: Object.entries(cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; '),
        description: '',
        enabled: true
      });
    }

    ipcRenderer
      .invoke('send-http-request', item, collection, environment, collectionVariables)
      .then(resolve)
      .catch(reject);
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
