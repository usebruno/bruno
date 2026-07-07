const eventHandlers = new Map();

export const startSignalRConnection = async (item, collection, environment, runtimeVariables) => {
  const { ipcRenderer } = window;
  const requestId = item.uid;
  const request = item.draft ? item.draft : item;
  const url = request.request?.url || '';
  const auth = request.request?.auth || {};
  const collectionUid = collection.uid;

  try {
    const result = await ipcRenderer.invoke('renderer:signalr:start-connection', {
      requestId,
      collectionUid,
      url,
      auth
    });
    return result;
  } catch (err) {
    throw err;
  }
};

export const stopSignalRConnection = async (requestId) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('renderer:signalr:stop-connection', requestId);
};

export const sendSignalRMessage = async (requestId, method, args) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('renderer:signalr:send-message', requestId, method, args);
};

export const isSignalRConnectionActive = async (requestId) => {
  const { ipcRenderer } = window;
  const result = await ipcRenderer.invoke('renderer:signalr:connection-status', requestId);
  return { isActive: result.status === 'connected' };
};

export const getSignalRConnectionStatus = async (requestId) => {
  const { ipcRenderer } = window;
  return ipcRenderer.invoke('renderer:signalr:connection-status', requestId);
};

export const registerSignalRHandler = (requestId, eventName, handler) => {
  const { ipcRenderer } = window;

  if (!eventHandlers.has(requestId)) {
    eventHandlers.set(requestId, new Map());
  }
  eventHandlers.get(requestId).set(eventName, handler);
  ipcRenderer.invoke('renderer:signalr:register-handler', requestId, eventName);
};

export const removeSignalRHandler = (requestId, eventName) => {
  const { ipcRenderer } = window;

  if (eventHandlers.has(requestId)) {
    if (eventName) {
      eventHandlers.get(requestId).delete(eventName);
    } else {
      eventHandlers.delete(requestId);
    }
  }
  ipcRenderer.invoke('renderer:signalr:remove-handler', requestId, eventName);
};
