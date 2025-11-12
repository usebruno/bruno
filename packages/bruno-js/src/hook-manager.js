/**
 * HookManager provides a simple event system for registering and calling hooks (event listeners).
 *
 * Hooks can be registered for specific string patterns or arrays of patterns.
 *
 * Usage examples:
 *
 * Note: The `on()` method is internal only. Users should use the namespaced convenience methods:
 * - bru.hooks.http.onBeforeRequest(handler)
 * - bru.hooks.http.onAfterResponse(handler)
 * - bru.hooks.runner.onBeforeCollectionRun(handler)
 * - bru.hooks.runner.onAfterCollectionRun(handler)
 *
 * Unregister handler by calling `unhook`
 * unhook()
 * or unregister for a specific pattern
 * unhook('beforeRequest')
 *
 * Call hooks for a single event (internal use)
 * hookManager.call('beforeRequest', { request, req, collection });
 *
 * Error Handling:
 * - By default, errors in one handler don't stop other handlers from running
 * - Errors are logged to console for debugging
 *
 * @class
 */
class HookManager {
  /**
   * HookManager lifecycle states
   * @readonly
   * @enum {string}
   */
  static State = Object.freeze({
    ACTIVE: 'active',
    DISPOSED: 'disposed'
  });

  /**
   * Standard hook event names used throughout the application.
   * @readonly
   */
  static EVENTS = Object.freeze({
    HTTP_BEFORE_REQUEST: 'http:beforeRequest',
    HTTP_AFTER_RESPONSE: 'http:afterResponse',
    RUNNER_BEFORE_COLLECTION_RUN: 'runner:beforeCollectionRun',
    RUNNER_AFTER_COLLECTION_RUN: 'runner:afterCollectionRun'
  });

  constructor() {
    this.listeners = {};
    this._state = HookManager.State.ACTIVE;
  }

  /**
   * Get the current state of the HookManager
   * @returns {string} Current state ('active' or 'disposed')
   */
  get state() {
    return this._state;
  }

  /**
   * Check if the HookManager is disposed
   * @returns {boolean} True if disposed
   */
  get isDisposed() {
    return this._state === HookManager.State.DISPOSED;
  }

  /**
   * Dispose of all resources held by this HookManager
   * Clears all handlers and marks the manager as disposed
   * Should be called when the HookManager is no longer needed
   */
  dispose() {
    if (this._state === HookManager.State.DISPOSED) {
      return;
    }
    this._state = HookManager.State.DISPOSED;

    // Clear all listeners
    this.clearAll();
  }

  /**
   * Validate that the HookManager is in a valid state for the operation
   * @private
   * @param {string} operation - Name of the operation being performed
   * @throws {Error} If HookManager is disposed
   */
  _validateState(operation) {
    if (this._state === HookManager.State.DISPOSED) {
      throw new Error(`Cannot ${operation}: HookManager has been disposed`);
    }
  }

  /**
   * Call all registered handlers for the given pattern(s)
   * Supports both sync and async handlers - all handlers are awaited
   * Error Isolation: Errors in one handler don't stop other handlers from running.
   * Errors are logged to console but don't affect execution flow.
   *
   * @param {string|string[]} pattern - Event pattern(s) to trigger
   * @param {*} data - Data to pass to handlers
   * @returns {Promise<void>}
   */
  async call(pattern, data) {
    // Validate state - but allow calls on disposed manager to fail gracefully
    if (this._state === HookManager.State.DISPOSED) {
      console.warn('HookManager.call() called on disposed instance');
      return;
    }

    if (typeof pattern !== 'string' && !Array.isArray(pattern)) {
      throw new TypeError('Pattern must be a string or an array of strings.');
    }

    const patternList = [].concat(pattern).map((d) => String(d).trim());

    for (const ptn of patternList) {
      if (!this.listeners[ptn]) continue;
      for (const handler of this.listeners[ptn]) {
        await callHandler(handler, data, ptn);
      }
    }
  }

  /**
   * Register a handler for the given pattern(s)
   * @param {string|string[]} pattern - Event pattern(s) to listen to
   * @param {Function} handler - Handler function to call
   * @returns {Function} Unhook function to remove the handler
   * @throws {Error} If HookManager is disposed
   */
  on(pattern, handler) {
    this._validateState('register handler');

    if (typeof pattern !== 'string' && !Array.isArray(pattern)) {
      throw new TypeError('Pattern must be a string or an array of strings.');
    }

    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a function.');
    }

    const patternList = [].concat(pattern).map((d) => String(d).trim());

    for (const ptn of patternList) {
      this.listeners[ptn] ||= [];

      // Check if handler is already registered
      const exists = this.listeners[ptn].some((d) => Object.is(d, handler));
      if (exists) {
        throw new Error(`${handler.name ?? 'anonymous'} handler was registered twice for hook pattern '${ptn}'`);
      }

      this.listeners[ptn].push(handler);
    }

    return this._createUnhook(patternList, handler);
  }

  /**
   * Create an unhook function for the given patterns and handler
   * @private
   */
  _createUnhook(patternList, handler) {
    const self = this;
    return function unhook(specific) {
      let patterns = [];
      if (specific) {
        patterns = [].concat(specific).map((d) => String(d).trim());
      } else {
        patterns = patternList;
      }

      for (const ptn of patterns) {
        if (!self.listeners[ptn]) continue;
        self.listeners[ptn] = self.listeners[ptn].filter((d) => !Object.is(d, handler));
      }
    };
  }

  /**
   * Clear all handlers for the given pattern(s)
   * @param {string|string[]} pattern - Event pattern(s) to clear
   */
  clear(pattern) {
    if (typeof pattern !== 'string' && !Array.isArray(pattern)) {
      throw new TypeError('Pattern must be a string or an array of strings.');
    }

    const patternList = [].concat(pattern).map((d) => String(d).trim());

    for (const ptn of patternList) {
      if (this.listeners[ptn]) {
        delete this.listeners[ptn];
      }
    }
  }

  /**
   * Clear all registered handlers
   */
  clearAll() {
    this.listeners = {};
  }
}

/**
 * Safely call a handler function with error handling
 * Supports both sync and async handlers
 * @private
 * @param {Function} handler - Handler function to call
 * @param {*} data - Data to pass to handler
 * @param {string} event - Event name for error reporting
 */
async function callHandler(handler, data, event) {
  const handlerName = handler?.name || 'anonymous';

  try {
    const result = handler(data);
    // If handler returns a Promise, await it
    if (result && typeof result.then === 'function') {
      await result;
    }
  } catch (error) {
    // Log the error with context
    console.error(
      `[Hook Error] Event: '${event}', Handler: '${handlerName}'`,
      error?.message || error
    );
  }
}

module.exports = HookManager;
