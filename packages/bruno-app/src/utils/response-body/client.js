import { RESPONSE_BODY_CHANNELS } from './media-url';

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

    pin(bodyRef) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.PIN, bodyRef);
    },

    release(pinIdOrBodyRef) {
      return ipcPort.invoke(RESPONSE_BODY_CHANNELS.RELEASE, pinIdOrBodyRef);
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
