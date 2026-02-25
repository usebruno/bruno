/**
 * Utility for waiting on collection mount completion.
 * Used by session restore to ensure collections are fully loaded before setting tabs.
 */

const POLL_INTERVAL = 100;
const DEFAULT_TIMEOUT = 30000;

/**
 * Returns a promise that resolves when a collection mount completes.
 * Uses a query-based approach to avoid race conditions with IPC events.
 *
 * @param {string} collectionUid - The UID of the collection to wait for
 * @param {number} timeout - Optional timeout in ms (default: 30000)
 * @returns {Promise<void>}
 */
export const waitForMountComplete = (collectionUid, timeout = DEFAULT_TIMEOUT) => {
  const { ipcRenderer } = window;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkMountStatus = async () => {
      // Query main process for mount completion status
      const isComplete = await ipcRenderer.invoke('renderer:is-collection-mount-complete', collectionUid);

      if (isComplete) {
        resolve();
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.warn(`[mount-wait] Timeout waiting for collection ${collectionUid}, proceeding anyway`);
        resolve();
        return;
      }

      // Poll again
      setTimeout(checkMountStatus, POLL_INTERVAL);
    };

    checkMountStatus();
  });
};
