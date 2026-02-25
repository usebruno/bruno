import { findCollectionByUid, areItemsLoading, flattenItems } from 'utils/collections';

const POLL_INTERVAL = 100;
const STABILITY_CHECKS = 3; // Number of consecutive checks with same item count
const DEFAULT_TIMEOUT = 30000;

/**
 * Creates a stability tracker for checking if items are fully loaded.
 * Items are considered "loaded" when:
 * 1. Collection is mounted
 * 2. No items are in loading state
 * 3. Item count has been stable for STABILITY_CHECKS consecutive calls
 */
export const createItemsLoadedChecker = () => {
  let lastItemCount = -1;
  let stableCount = 0;

  return (collection) => {
    if (!collection) {
      return { ready: false, reason: 'no-collection' };
    }

    // Check if mounted and no items are loading
    const isMounted = collection.mountStatus === 'mounted';
    const isLoading = areItemsLoading(collection);

    if (!isMounted || isLoading) {
      // Reset stability counter when still loading
      lastItemCount = -1;
      stableCount = 0;
      return { ready: false, reason: isLoading ? 'items-loading' : 'not-mounted' };
    }

    // Check item count stability to ensure all IPC messages are processed
    const currentItemCount = flattenItems(collection.items || []).length;

    if (currentItemCount === lastItemCount) {
      stableCount++;
      if (stableCount >= STABILITY_CHECKS) {
        return { ready: true, itemCount: currentItemCount };
      }
    } else {
      // Item count changed, reset stability counter
      lastItemCount = currentItemCount;
      stableCount = 1;
    }

    return { ready: false, reason: 'stabilizing', itemCount: currentItemCount };
  };
};

/**
 * Waits until collection items have fully loaded.
 *
 * @param {string} collectionUid - The collection UID to wait for
 * @param {Function} getState - Redux getState function
 * @param {number} timeout - Maximum wait time in milliseconds
 */
export const waitForMountComplete = (collectionUid, getState, timeout = DEFAULT_TIMEOUT) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkItemsLoaded = createItemsLoadedChecker();

    const poll = () => {
      const collection = findCollectionByUid(getState().collections.collections, collectionUid);
      const status = checkItemsLoaded(collection);

      if (status.ready) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        console.warn(`[mount-wait] Timeout for collection ${collectionUid}. status=${status.reason}, itemCount=${status.itemCount}`);
        resolve();
        return;
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    poll();
  });
};
