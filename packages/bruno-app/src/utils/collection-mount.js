const POLL_INTERVAL = 100;
const DEFAULT_TIMEOUT = 30000;

/**
 * Polls until collection mount completes or timeout.
 * Uses query-based approach to avoid race conditions with IPC events.
 */
export const waitForMountComplete = (collectionUid, timeout = DEFAULT_TIMEOUT) => {
  const { ipcRenderer } = window;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const poll = async () => {
      const isComplete = await ipcRenderer.invoke('renderer:is-collection-mount-complete', collectionUid);

      if (isComplete || Date.now() - startTime > timeout) {
        if (!isComplete) {
          console.warn(`[mount-wait] Timeout waiting for collection ${collectionUid}`);
        }
        resolve();
        return;
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    poll();
  });
};
