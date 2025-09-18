export const sendNetworkRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, runtimeVariables)
        .then((response) => {
          // if there is an error, we return the response object as is
          if (response?.error) {
            resolve(response);
          }
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
    }
  });
};

export const sendGrpcRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
     startGrpcRequest(item, collection, environment, runtimeVariables)
        .then((initialState) => {
          // Return an initial state object to update the UI
          // The real response data will be handled by event listeners
          resolve({
            ...initialState,
            timeline: []
          });
        })
        .catch((err) => reject(err));
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

export const startGrpcRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const request = item.draft ? item.draft : item;

    ipcRenderer.invoke('grpc:start-connection', {
      request, 
      collection, 
      environment, 
      runtimeVariables
    })
    .then(() => {
      resolve();
    })
    .catch(err => {
      reject(err);
    });
  });
};

/**
 * Sends a message to an existing gRPC stream
 * @param {string} requestId - The request ID to send a message to
 * @param {Object} message - The message to send
 * @returns {Promise<Object>} - The result of the send operation
 */
export const sendGrpcMessage = async (item, collectionUid, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
     ipcRenderer.invoke('grpc:send-message', item.uid, collectionUid, message)
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Cancels a running gRPC request
 * @param {string} requestId - The request ID to cancel
 * @returns {Promise<Object>} - The result of the cancel operation
 */
export const cancelGrpcRequest = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:cancel', requestId)
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Ends a gRPC streaming request (client-streaming or bidirectional)
 * @param {string} requestId - The request ID to end
 * @returns {Promise<Object>} - The result of the end operation
 */
export const endGrpcStream = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:end', requestId)
      .then(resolve)
      .catch(reject);
  });
};

export const loadGrpcMethodsFromProtoFile = async (filePath, includeDirs = []) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-proto', { filePath, includeDirs }).then(resolve).catch(reject);
  });
};

// export const getGrpcMethodsFromReflection = async (request, collection, environment, runtimeVariables) => {
//   return new Promise((resolve, reject) => {
//     const { ipcRenderer } = window;
//     ipcRenderer.invoke('grpc:load-methods-reflection', { request, collection, environment, runtimeVariables }).then(resolve).catch(reject);
//   });
// };

export const cancelGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:cancel-request', { requestId: connectionId }).then(resolve).catch(reject);
  });
};

export const endGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:end-request', { requestId: connectionId }).then(resolve).catch(reject);
  });
};

/**
 * Check if a gRPC connection is active
 * @param {string} connectionId - The connection ID to check
 * @returns {Promise<boolean>} - Whether the connection is active
 */
export const isGrpcConnectionActive = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:is-connection-active', connectionId)
      .then(response => {
        if (response.success) {
          resolve(response.isActive);
        } else {
          // If there was an error, assume the connection is not active
          console.error('Error checking connection status:', response.error);
          resolve(false);
        }
      })
      .catch(err => {
        console.error('Failed to check connection status:', err);
        // On error, assume the connection is not active
        resolve(false);
      });
  });
};

/**
 * Generates a sample gRPC message for a method
 * @param {string} methodPath - The full gRPC method path
 * @param {string|null} existingMessage - Optional existing message JSON string to use as a template
 * @param {Object} options - Additional options for message generation
 * @returns {Promise<Object>} The generated sample message or error
 */
export const generateGrpcSampleMessage = async (methodPath, existingMessage = null, options = {}) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('grpc:generate-sample-message', { 
      methodPath, 
      existingMessage, 
      options 
    })
    .then(resolve)
    .catch(reject);
  });
};

export const connectWS = async (item, collection, environment, runtimeVariables, options) => {
  return new Promise((resolve, reject) => {
    startWsConnection(item, collection, environment, runtimeVariables, options)
      .then((initialState) => {
        // Return an initial state object to update the UI
        // The real response data will be handled by event listeners
        resolve({
          ...initialState,
          timeline: []
        });
      })
      .catch((err) => reject(err));
  });
};

export const sendWsRequest = (item, collection, environment, runtimeVariables) => {
  return new Promise(async (resolve, reject) => {
    const ensureConnection = async () => {
      const connectionStatus = await isWsConnectionActive(item.uid);
      if (!connectionStatus.isActive) {
        await connectWS(item, collection, environment, runtimeVariables);
      }
    };
    const { request } = item.draft ? item.draft : item;
    queueWsMessage(item, collection.uid, request.body.ws[0].content)
      .then((initialState) => {
        // Return an initial state object to update the UI
        // The real response data will be handled by event listeners
        resolve({
          ...initialState,
        });
      })
      .catch((err) => reject(err));
    await ensureConnection();
  });
};

export const startWsConnection = async (item, collection, environment, runtimeVariables, options) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const request = item.draft ? item.draft : item;
    const settings = item.draft ? item.draft.settings : item.settings;

    ipcRenderer
      .invoke('ws:start-connection', {
        request,
        collection,
        environment,
        runtimeVariables,
        settings,
        options
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * Sends a message to an existing WebSocket connection
 * @param {string} requestId - The request ID to send a message to
 * @param {string} collectionUid - The collection ID the message is for
 * @param {*} message - The message
 * @returns {Promise<Object>} - The result of the send operation
 */
export const queueWsMessage = async (item, collectionUid, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('ws:queue-message', item.uid, collectionUid, message).then(resolve).catch(reject);
  });
};

/**
 * Sends a message to an existing WebSocket connection
 * @param {string} requestId - The request ID to send a message to
 * @param {Object} message - The message to send
 * @returns {Promise<Object>} - The result of the send operation
 */
export const sendWsMessage = async (item, collectionUid, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('ws:send-message', item.uid, collectionUid, message).then(resolve).catch(reject);
  });
};

/**
 * Closes a WebSocket connection
 * @param {string} requestId - The request ID to close
 * @returns {Promise<Object>} - The result of the close operation
 */
export const closeWsConnection = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('ws:close-connection', requestId).then(resolve).catch(reject);
  });
};

/**
 * Checks if a WebSocket connection is active
 * @param {string} requestId - The request ID to check
 * @returns {Promise<boolean>} - Whether the connection is active
 */
export const isWsConnectionActive = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('ws:is-connection-active', requestId).then(resolve).catch(reject);
  });
};
