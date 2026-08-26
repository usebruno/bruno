import { createResponseBodyClient } from '../core/client';

export const createElectronIpcPort = () => {
  const { ipcRenderer } = window;
  return {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  };
};

let defaultClient = null;

export const getResponseBodyClient = () => {
  if (!defaultClient) {
    defaultClient = createResponseBodyClient(createElectronIpcPort());
  }
  return defaultClient;
};
