/**
 * BatchAggregator - Batches IPC events to reduce Redux dispatch overhead.
 *
 * Instead of sending individual 'main:collection-tree-updated' events for each file,
 * this aggregator collects events and sends them in batches, reducing the number of
 * Redux updates and improving UI performance during collection mounting.
 *
 * Flush triggers:
 * - Time-based: Every DISPATCH_INTERVAL_MS (100ms)
 * - Size-based: When batch reaches MAX_BATCH_SIZE (50 items)
 * - Manual: Call flush() directly (e.g., on watcher 'ready' event)
 */

const DISPATCH_INTERVAL_MS = 150;
const MAX_BATCH_SIZE = 200;

class BatchAggregator {
  constructor(win, collectionUid) {
    this.win = win;
    this.queue = [];
    this.timer = null;
    this.isDestroyed = false;
    // Bind methods
    // We need to binf the methods because these are being called as callbacks to
    // chokidar's add, addDir, change, unlink, unlinkDir events

    this.add = this.add.bind(this);
    this.flush = this.flush.bind(this);
    this._scheduleFlush = this._scheduleFlush.bind(this);
  }

  /**
   * Check if the window is still valid for sending events
   */
  _isWindowValid() {
    return this.win && !this.win.isDestroyed() && !this.isDestroyed;
  }

  /**
   * Schedule a flush after the dispatch interval
   */
  _scheduleFlush() {
    if (this.timer || !this._isWindowValid()) {
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, DISPATCH_INTERVAL_MS);
  }

  /**
   * Add an event to the batch queue
   * @param {string} eventType - The event type ('addFile', 'addDir', 'change', 'unlink', 'unlinkDir')
   * @param {object} payload - The event payload
   */
  add(eventType, payload) {
    if (!this._isWindowValid()) {
      return;
    }

    this.queue.push({
      eventType,
      payload
    });

    // Flush immediately if batch is full
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    } else {
      this._scheduleFlush();
    }
  }

  /**
   * Flush the current batch to the renderer
   */
  flush() {
    // Clear any pending timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0 || !this._isWindowValid()) {
      return;
    }

    // Take all items from the queue
    // This is a copy-type operatition to avoid mutating the original
    // Splice returns the deleted items
    const batch = this.queue.splice(0);

    try {
      // Send the batch to the renderer
      this.win.webContents.send('main:collection-tree-batch-updated', batch);
    } catch (error) {
      console.error('BatchAggregator: Error sending batch:', error);
    }
  }

  /**
   * Get the current queue size
   * @returns {number} - The number of items in the queue
   */
  size() {
    return this.queue.length;
  }

  /**
   * Clear the queue without sending
   */
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }

  /**
   * Mark this aggregator as destroyed (e.g., when window closes)
   */
  destroy() {
    this.isDestroyed = true;
    this.clear();
    this.win = null;
  }
}

// Store for managing aggregators per collection
const aggregators = new Map();

/**
 * Get the aggregator key for a window and collection UID
 * @param {BrowserWindow} win - The Electron BrowserWindow
 * @param {string} collectionUid - The collection UID
 * @returns {string} - The aggregator key
 */
const getAggregatorKey = (win, collectionUid) => {
  return `${win.id}-${collectionUid}`;
};

/**
 * Get or create a BatchAggregator for a window
 * @param {BrowserWindow} win - The Electron BrowserWindow
 * @returns {BatchAggregator} - The aggregator instance
 */
const getAggregator = (win, collectionUid) => {
  const aggregatorKey = getAggregatorKey(win, collectionUid);

  if (!aggregators.has(aggregatorKey)) {
    const aggregator = new BatchAggregator(win, collectionUid);

    // Clean up when window is closed
    win.on('closed', () => {
      const agg = aggregators.get(aggregatorKey);
      if (agg) {
        agg.destroy();
        aggregators.delete(aggregatorKey);
      }
    });

    aggregators.set(aggregatorKey, aggregator);
  }

  return aggregators.get(aggregatorKey);
};

/**
 * Remove an aggregator for a window
 * @param {BrowserWindow} win - The Electron BrowserWindow
 */
const removeAggregator = (win, collectionUid) => {
  const aggregatorKey = getAggregatorKey(win, collectionUid);
  const aggregator = aggregators.get(aggregatorKey);

  if (aggregator) {
    aggregator.destroy();
    aggregators.delete(aggregatorKey);
  }
};

module.exports = {
  BatchAggregator,
  getAggregator,
  removeAggregator
};
