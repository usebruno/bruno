/**
 * Wrapper for ipcRenderer.invoke that handles error cases
 * @param {string} channel - The IPC channel name
 * @param {...any} args - Arguments to pass to the channel
 * @returns {Promise} - Resolves with the result or rejects with error
 */
export const callIpc = (channel, ...args) => {
  const { ipcRenderer } = window;
  if (!ipcRenderer) {
    return Promise.reject(new Error('IPC Renderer not available'));
  }

  return ipcRenderer.invoke(channel, ...args);
};