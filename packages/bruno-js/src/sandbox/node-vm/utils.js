const vm = require('node:vm');
const path = require('node:path');
const nodeModule = require('node:module');

/**
 * Check if a module is a Node.js builtin
 * @param {string} moduleName - Module name to check
 * @returns {boolean} True if module is a builtin
 */
function isBuiltinModule(moduleName) {
  const normalized = moduleName.startsWith('node:') ? moduleName.slice(5) : moduleName;
  return nodeModule.builtinModules.includes(normalized);
}

/**
 * Validate that a path is within allowed context roots
 * @param {string} normalizedPath - Normalized file path
 * @param {Array<string>} additionalContextRootsAbsolute - Allowed roots
 * @returns {boolean} True if path is within allowed roots
 */
function isPathWithinAllowedRoots(normalizedPath, additionalContextRootsAbsolute) {
  return additionalContextRootsAbsolute.some((allowedRoot) => {
    const normalizedAllowedRoot = path.normalize(allowedRoot);
    const relativePath = path.relative(normalizedAllowedRoot, normalizedPath);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  });
}

class ScriptError extends Error {
  constructor(error, script) {
    super(error.message);
    this.name = 'ScriptError';
    this.originalError = error;
    this.script = script;
    this.stack = error.stack;
  }
}

/**
 * Build a filtered process object
 * Exposes only safe information properties
 * @returns {Object} Filtered process object
 */
function buildSanitizedProcess() {
  return {
    argv: [...process.argv],
    title: process.title,
    version: process.version,
    versions: { ...process.versions },
    arch: process.arch,
    platform: process.platform,
    env: {}, // Empty by default
    pid: process.pid,
    features: { ...process.features }
  };
}

/**
 * Pre-compiled VM script that wraps methods on req, res, and bru
 * to return VM-native objects via recursive deep clone.
 *
 * Host-context objects have different Object/Array constructors than VM-context objects.
 * Libraries like AJV use fast-deep-equal which checks `a.constructor !== b.constructor`,
 * causing deep equality to fail for structurally identical cross-context objects.
 *
 * Creating new objects/arrays inside the VM gives them VM-native prototypes.
 * Uses recursive clone instead of JSON round-trip to preserve undefined values.
 *
 * Wraps all methods on res, req, bru that return Objects/Arrays so their
 * return values get VM-native prototypes. Async methods (sendRequest, runRequest)
 * have their resolved values wrapped. Methods returning primitives, Buffers,
 * or undefined (setters) are skipped.
 */
const recontextualizeScript = new vm.Script(`
  (function() {
    function toVMNative(val) {
      if (val === null || val === undefined || typeof val !== 'object') return val;

      if (Array.isArray(val)) {
        var arr = new Array(val.length);
        for (var i = 0; i < val.length; i++) {
          arr[i] = toVMNative(val[i]);
        }
        return arr;
      }

      var keys = Object.keys(val);
      var obj = {};
      for (var k = 0; k < keys.length; k++) {
        obj[keys[k]] = toVMNative(val[keys[k]]);
      }
      return obj;
    }

    function wrapMethod(obj, method) {
      var orig = obj[method].bind(obj);
      obj[method] = function() { return toVMNative(orig.apply(null, arguments)); };
    }

    function wrapAsyncMethod(obj, method) {
      var orig = obj[method].bind(obj);

      function cloneResponseData(res) {
        if (res && typeof res === 'object') {
          if (res.data !== undefined) res.data = toVMNative(res.data);
          if (res.headers !== undefined) res.headers = toVMNative(res.headers);
        }
        return res;
      }

      obj[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        var lastIdx = args.length - 1;
        if (lastIdx >= 0 && typeof args[lastIdx] === 'function') {
          var userCb = args[lastIdx];
          args[lastIdx] = function(err, res) { return userCb(err, cloneResponseData(res)); };
        }
        return orig.apply(null, args).then(cloneResponseData);
      };
    }

    /** Replaces a callable with a new function that clones its return value. */
    function wrapCallable(fn) {
      var _apply = Function.prototype.apply;
      var wrapped = function() { return toVMNative(_apply.call(fn, null, arguments)); };
      Object.setPrototypeOf(wrapped, Object.getPrototypeOf(fn));
      var names = Object.getOwnPropertyNames(fn);
      for (var i = 0; i < names.length; i++) {
        try { wrapped[names[i]] = fn[names[i]]; } catch(e) {}
      }
      return wrapped;
    }

    function wrapAllMethods(obj, skip, async) {
      var proto = obj;
      while (proto && proto !== Object.prototype && proto !== Function.prototype) {
        var names = Object.getOwnPropertyNames(proto);
        for (var i = 0; i < names.length; i++) {
          var key = names[i];
          if (key === 'constructor') continue;
          if (typeof obj[key] !== 'function') continue;
          if (skip.includes(key)) continue;
          if (async && async.includes(key)) {
            wrapAsyncMethod(obj, key);
          } else {
            wrapMethod(obj, key);
          }
        }
        proto = Object.getPrototypeOf(proto);
      }
    }

    var skipBru = ['sleep', 'setVar', 'setEnvVar', 'deleteEnvVar', 'setGlobalEnvVar',
      'deleteVar', 'deleteAllVars', 'setNextRequest'];
    var asyncBru = ['sendRequest', 'runRequest'];
    var skipReq = ['setUrl', 'setMethod', 'setHeaders', 'setHeader', 'setBody',
      'setMaxRedirects', 'setTimeout', 'onFail', 'disableParsingResponseJson',
      'hasJSONContentType', '__safeParseJSON', '__safeStringifyJSON', '__isObject'];
    var skipRes = ['setBody', 'getDataBuffer'];

    if (typeof bru !== 'undefined' && bru) wrapAllMethods(bru, skipBru, asyncBru);
    if (typeof req !== 'undefined' && req) wrapAllMethods(req, skipReq);

    // res is a callable — its arrow function captures this.body from the hidden
    // BrunoResponse instance via closure, so wrapping methods alone is not enough.
    // We replace res with a new callable that clones the return value,
    // copy over its own properties and prototype, then clone data properties
    // (res.body, res.headers) for direct access.
    if (typeof res !== 'undefined' && res) {
      if (typeof res === 'function') {
        res = wrapCallable(res);
      }

      if (res.body !== undefined) res.body = toVMNative(res.body);
      if (res.headers !== undefined) res.headers = toVMNative(res.headers);

      wrapAllMethods(res, skipRes);
    }
  })();
`, { filename: 'bruno__recontextualize' });

module.exports = {
  isBuiltinModule,
  isPathWithinAllowedRoots,
  ScriptError,
  buildSanitizedProcess,
  recontextualizeScript
};
