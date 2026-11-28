const { cleanJson } = require('../utils');
const { performance } = require('node:perf_hooks');

/**
 * The console methods a script can call, matching Node's console. Single source
 * of truth: the QuickJS shim exposes exactly these, and the factory implements
 * each one.
 */
const CONSOLE_METHODS = [
  'assert',
  'clear',
  'count',
  'countReset',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'profile',
  'profileEnd',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'timeStamp',
  'trace',
  'warn'
];

/**
 * Builds the `console` object a script runs with.
 *
 * Every method of Node's console exists, so a script never fails with
 * "console.X is not a function" (usebruno/bruno#1721). Each call is forwarded to
 * `onConsoleLog` as one of the log types the console pane and the CLI already
 * render (log / info / warn / error / debug); the console pane filters by type,
 * so unknown types would be hidden.
 *
 * Stateful methods (count, time) keep their state per console instance, which
 * lives for one script execution. Methods with no observable output in a log
 * pane (groupEnd, clear, and countReset, which resets a counter without
 * logging) or no sandbox equivalent (profile, profileEnd, timeStamp) are
 * accepted and do nothing observable.
 *
 * @param {function(string, Array)} onConsoleLog - Called with the log type and the cleaned arguments.
 * @returns {object} The console object to expose to the script.
 */
const createScriptConsole = (onConsoleLog) => {
  const counters = new Map();
  const timers = new Map();

  const forward = (type) => (...args) => {
    onConsoleLog(type, cleanJson(args));
  };

  const log = forward('log');

  return {
    assert: (condition, ...args) => {
      if (!condition) {
        // Node prefixes the message: "Assertion failed: <message>".
        onConsoleLog('error', cleanJson(['Assertion failed', ...args]));
      }
    },
    // Nothing to clear in the console pane.
    clear: () => {},
    count: (label = 'default') => {
      const count = (counters.get(label) || 0) + 1;
      counters.set(label, count);
      log(`${label}: ${count}`);
    },
    countReset: (label = 'default') => {
      counters.delete(label);
    },
    debug: forward('debug'),
    dir: log,
    dirxml: log,
    error: forward('error'),
    group: log,
    groupCollapsed: log,
    // The console pane has no nesting to close.
    groupEnd: () => {},
    info: forward('info'),
    log,
    // No CPU profiler in the sandbox.
    profile: () => {},
    profileEnd: () => {},
    table: log,
    time: (label = 'default') => {
      // A second start for a running timer keeps the original start, like Node.
      if (!timers.has(label)) {
        timers.set(label, performance.now());
      }
    },
    timeEnd: (label = 'default') => {
      const startedAt = timers.get(label);
      if (startedAt === undefined) {
        return;
      }
      timers.delete(label);
      log(`${label}: ${performance.now() - startedAt}ms`);
    },
    timeLog: (label = 'default', ...args) => {
      const startedAt = timers.get(label);
      if (startedAt === undefined) {
        return;
      }
      log(`${label}: ${performance.now() - startedAt}ms`, ...args);
    },
    // No DevTools timeline in the sandbox.
    timeStamp: () => {},
    trace: log,
    warn: forward('warn')
  };
};

module.exports = { createScriptConsole, CONSOLE_METHODS };
