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
            duration: response.duration,
            timeline: response.timeline
          });
        })
        .catch((err) => reject(err));
    } else if (item.type === 'grpc-request') {
      startGrpcRequest(item, collection, environment, runtimeVariables)
        .then((response) => {
          resolve(response);
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
    resolve({});
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

export const startGrpcRequest = async (item, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:start-connection',{request: item, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions}).then(resolve).catch(reject);
  });
};

export const sendGrpcMessage = async (request, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:send-message', request, message).then(resolve).catch(reject);
  });
};

export const loadGrpcMethodsFromProtoFile = async (filePath, includeDirs = []) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-proto', { filePath, includeDirs }).then(resolve).catch(reject);
  });
};

export const loadGrpcMethodsFromReflection = async (url, rootCertificate, privateKey, certificateChain,  verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-reflection', { url, rootCertificate, privateKey, certificateChain, verifyOptions }).then(resolve).catch(reject);
  });
};

export const loadGrpcMethodsFromBufReflection = async (url, rootCertificate, privateKey, certificateChain,  verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-buf-reflection', { url, rootCertificate, privateKey, certificateChain, verifyOptions }).then(resolve).catch(reject);
  });
};

export const cancelGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('cancel-grpc-request', connectionId).then(resolve).catch(reject);
  });
};

export const endGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('end-grpc-connection', connectionId).then(resolve).catch(reject);
  });
};
