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
 * @class
 */
class HookManager {
  constructor() {
    this.listeners = {};
  }

  /**
   * Call all registered handlers for the given pattern(s)
   * Supports both sync and async handlers - all handlers are awaited
   * Wildcard handlers ('*') are called for every pattern, in addition to specific pattern handlers
   * @param {string|string[]} pattern - Event pattern(s) to trigger
   * @param {*} data - Data to pass to handlers
   * @returns {Promise<void>} Promise that resolves when all handlers complete
   */
  async call(pattern, data) {
    if (typeof pattern !== 'string' && !Array.isArray(pattern)) {
      throw new TypeError('Pattern must be a string or an array of strings.');
    }

    const patternList = [].concat(pattern).map((d) => String(d).trim());
    const hasWildcard = patternList.includes('*');

    if (hasWildcard) {
      for (const ptn of Object.keys(this.listeners)) {
        const handlers = this.listeners[ptn];
        for (const handler of handlers) {
          await callHandler(handler, data, ptn);
        }
      }
      return;
    }

    // Call handlers for each specific pattern
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
   */
  on(pattern, handler) {
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
 * @returns {Promise<void>} Promise that resolves when handler completes
 */
async function callHandler(handler, data, event) {
  try {
    const result = handler(data);
    // If handler returns a Promise, await it
    if (result && typeof result.then === 'function') {
      await result;
    }
  } catch (error) {
    console.error(`Failed to execute handler for event: '${event}' with handler: '${handler?.name ?? 'anonymous'}'`, error);
  }
}

module.exports = HookManager;
