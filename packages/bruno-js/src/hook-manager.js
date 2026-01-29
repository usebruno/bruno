/**
 * Error information from hook execution
 * @typedef {Object} HookError
 * @property {string} event - The event that was being processed
 * @property {string} handlerName - Name of the handler that failed
 * @property {string} message - Error message
 * @property {string} [stack] - Error stack trace
 * @property {Error} [originalError] - Original error object
 */

/**
 * Hook execution result with error aggregation
 * @typedef {Object} HookCallResult
 * @property {boolean} success - Whether all handlers completed successfully
 * @property {number} handlersExecuted - Number of handlers that were executed
 * @property {number} handlersFailed - Number of handlers that failed
 * @property {Array<HookError>} errors - Array of errors that occurred
 */

/**
 * HookManager provides a simple event system for registering and calling hooks (event listeners).
 *
 * Hooks can be registered for specific string patterns or arrays of patterns. The special pattern '*' acts as a wildcard.
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
 * - Errors are logged to console and optionally collected
 * - Use the options parameter to customize error handling behavior
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
   * Wildcard handlers ('*') are called for every pattern, in addition to specific pattern handlers
   *
   * Error Isolation: By default, errors in one handler don't stop other handlers.
   * Use options.stopOnError = true to stop execution on first error.
   *
   * @param {string|string[]} pattern - Event pattern(s) to trigger
   * @param {*} data - Data to pass to handlers
   * @param {object} [options] - Call options
   * @param {boolean} [options.stopOnError=false] - Stop execution on first error
   * @param {boolean} [options.collectErrors=false] - Collect and return errors
   * @param {function} [options.onError] - Callback for each error (receives HookError)
   * @returns {Promise<HookCallResult|void>} Result with error info if collectErrors=true
   */
  async call(pattern, data, options = {}) {
    // Validate state - but allow calls on disposed manager to fail gracefully
    if (this._state === HookManager.State.DISPOSED) {
      console.warn('HookManager.call() called on disposed instance');
      if (options.collectErrors) {
        return {
          success: false,
          handlersExecuted: 0,
          handlersFailed: 0,
          errors: [{ event: String(pattern), message: 'HookManager has been disposed' }]
        };
      }
      return;
    }

    if (typeof pattern !== 'string' && !Array.isArray(pattern)) {
      throw new TypeError('Pattern must be a string or an array of strings.');
    }

    const { stopOnError = false, collectErrors = false, onError } = options;
    const errors = [];
    let handlersExecuted = 0;
    let handlersFailed = 0;

    const patternList = [].concat(pattern).map((d) => String(d).trim());
    const hasWildcard = patternList.includes('*');

    /**
     * Execute a single handler with error handling
     * @param {Function} handler - Handler to execute
     * @param {string} event - Event name
     * @returns {Promise<boolean>} True if should continue, false if should stop
     */
    const executeHandler = async (handler, event) => {
      handlersExecuted++;
      const result = await callHandler(handler, data, event, { onError, collectErrors });

      if (!result.success) {
        handlersFailed++;

        if (collectErrors && result.error) {
          errors.push(result.error);
        }

        if (stopOnError) {
          return false; // Signal to stop execution
        }
      }

      return true; // Continue execution
    };

    if (hasWildcard) {
      for (const ptn of Object.keys(this.listeners)) {
        const handlers = this.listeners[ptn];
        for (const handler of handlers) {
          const shouldContinue = await executeHandler(handler, ptn);
          if (!shouldContinue) {
            if (collectErrors) {
              return { success: false, handlersExecuted, handlersFailed, errors };
            }
            return;
          }
        }
      }
    } else {
      // Call handlers for each specific pattern
      for (const ptn of patternList) {
        if (!this.listeners[ptn]) continue;
        for (const handler of this.listeners[ptn]) {
          const shouldContinue = await executeHandler(handler, ptn);
          if (!shouldContinue) {
            if (collectErrors) {
              return { success: false, handlersExecuted, handlersFailed, errors };
            }
            return;
          }
        }
      }
    }

    if (collectErrors) {
      return {
        success: handlersFailed === 0,
        handlersExecuted,
        handlersFailed,
        errors
      };
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
    const hasWildcard = patternList.includes('*');

    if (hasWildcard) {
      (this.listeners['*'] ||= []).push(handler);
      return this._createUnhook(patternList, handler);
    }

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

      const hasStar = patterns.includes('*');

      if (hasStar && self.listeners['*']) {
        self.listeners['*'] = self.listeners['*'].filter((d) => !Object.is(d, handler));
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
      if (ptn === '*') {
        delete this.listeners['*'];
      } else if (this.listeners[ptn]) {
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
 * @param {object} [options] - Options for error handling
 * @param {function} [options.onError] - Callback for errors
 * @param {boolean} [options.collectErrors] - Whether to collect error details
 * @returns {Promise<{success: boolean, error?: HookError}>} Result object
 */
async function callHandler(handler, data, event, options = {}) {
  const { onError, collectErrors = false } = options;
  const handlerName = handler?.name || 'anonymous';

  try {
    const result = handler(data);
    // If handler returns a Promise, await it
    if (result && typeof result.then === 'function') {
      await result;
    }
    return { success: true };
  } catch (error) {
    const errorInfo = {
      event,
      handlerName,
      message: error?.message || String(error),
      stack: error?.stack,
      originalError: error
    };

    // Log the error with context
    console.error(
      `[Hook Error] Event: '${event}', Handler: '${handlerName}'`,
      error?.message || error
    );

    // Call error callback if provided
    if (typeof onError === 'function') {
      try {
        onError(errorInfo);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }

    return {
      success: false,
      error: collectErrors ? errorInfo : undefined
    };
  }
}

/**
 * Create a HookError object from an error
 * @param {string} event - Event name
 * @param {string} handlerName - Handler name
 * @param {Error} error - Original error
 * @returns {HookError} Formatted error object
 */
function createHookError(event, handlerName, error) {
  return {
    event,
    handlerName,
    message: error?.message || String(error),
    stack: error?.stack,
    originalError: error
  };
}

module.exports = HookManager;
