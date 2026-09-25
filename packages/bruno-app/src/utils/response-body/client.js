export const RESPONSE_BODY_CHANNELS = {
  SAVE: 'renderer:response-body-save',
  READ: 'renderer:response-body-read'
};

/**
 * @param {{ invoke: (channel: string, ...args: any[]) => Promise<any> }} ipcPort
 */
export const createResponseBodyClient = (ipcPort) => {
  if (!ipcPort || typeof ipcPort.invoke !== 'function') {
    throw new Error('createResponseBodyClient requires an IpcPort with invoke()');
  }

  return {
    save(bodyRef, { url, pathname, headers } = {}) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.SAVE, { bodyRef, url, pathname, headers });
    },

    read(bodyRef, options) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.READ, bodyRef, options);
    }
  };
};

let defaultClient = null;

export const getResponseBodyClient = () => {
  if (!defaultClient) {
    const { ipcRenderer } = window;
    defaultClient = createResponseBodyClient({
      invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
    });
  }
  return defaultClient;
};
