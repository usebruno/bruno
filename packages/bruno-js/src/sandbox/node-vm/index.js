const vm = require('node:vm');
const path = require('node:path');
const { get } = require('lodash');
const lodash = require('lodash');
const { mixinTypedArrays } = require('../mixins/typed-arrays');
const { wrapConsoleWithSerializers } = require('./console');
const { ScriptError } = require('./utils');
const { createCustomRequire } = require('./cjs-loader');

/**
 * Executes a script in a Node.js VM context with enhanced security and module loading
 *
 * @param {Object} options - Configuration options
 * @param {string} options.script - The script code to execute
 * @param {Object} options.context - The execution context with Bruno objects
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.scriptingConfig - Scripting configuration options
 * @returns {Promise<void>}
 * @throws {ScriptError} When script execution fails
 */
async function runScriptInNodeVm({ script, context, collectionPath, scriptingConfig }) {
  if (script.trim().length === 0) {
    return;
  }

  try {
    // Compute allowed context roots for security validation
    const additionalContextRoots = get(scriptingConfig, 'additionalContextRoots', []);
    const additionalContextRootsAbsolute = lodash
      .chain(additionalContextRoots)
      .map((acr) => (path.isAbsolute(acr) ? acr : path.join(collectionPath, acr)))
      .map((acr) => path.normalize(acr))
      .value();
    additionalContextRootsAbsolute.push(path.normalize(collectionPath));

    // Build the script context with Bruno objects and globals
    const scriptContext = buildScriptContext(context, scriptingConfig);

    // Create module cache for CJS modules
    const localModuleCache = new Map();

    // Add require() function for CJS module loading
    scriptContext.require = createCustomRequire({
      collectionPath,
      scriptContext,
      currentModuleDir: collectionPath,
      localModuleCache,
      additionalContextRootsAbsolute
    });

    // Execute the script
    const scriptFunction = vm.compileFunction(`return (async function(){ ${script} \n})();`, [], {
      filename: path.join(collectionPath, 'script.js'),
      contextExtensions: [scriptContext]
    });

    await scriptFunction();
  } catch (error) {
    throw new ScriptError(error, script);
  }
}

/**
 * Build the script context with Bruno objects and necessary globals
 * @param {Object} context - Bruno context (bru, req, res, etc.)
 * @param {Object} scriptingConfig - Scripting configuration
 * @returns {Object} Script context object
 */
function buildScriptContext(context, scriptingConfig) {
  const scriptContext = {
    // Bruno context (wrap console with Set/Map support)
    console: wrapConsoleWithSerializers(context.console),
    req: context.req,
    res: context.res,
    bru: context.bru,
    expect: context.expect,
    assert: context.assert,
    __brunoTestResults: context.__brunoTestResults,
    test: context.test,

    // Configuration for nested module loading
    scriptingConfig: scriptingConfig,

    // Global objects - shared from host process
    // Note: This exposes host globals (process, Buffer, timers) to scripts.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for globals.
    Buffer: global.Buffer,
    process: global.process,
    setTimeout: global.setTimeout,
    setInterval: global.setInterval,
    clearTimeout: global.clearTimeout,
    clearInterval: global.clearInterval,
    setImmediate: global.setImmediate,
    clearImmediate: global.clearImmediate,
    queueMicrotask: global.queueMicrotask,

    // Error types
    Error: global.Error,
    TypeError: global.TypeError,
    ReferenceError: global.ReferenceError,
    SyntaxError: global.SyntaxError,
    RangeError: global.RangeError,
    URIError: global.URIError,
    EvalError: global.EvalError,
    AggregateError: global.AggregateError,

    // Core JavaScript globals needed by bundled modules
    Object: global.Object,
    Array: global.Array,
    Function: global.Function,
    String: global.String,
    Number: global.Number,
    Boolean: global.Boolean,
    Symbol: global.Symbol,
    Date: global.Date,
    RegExp: global.RegExp,
    JSON: global.JSON,
    Math: global.Math,
    Map: global.Map,
    Set: global.Set,
    WeakMap: global.WeakMap,
    WeakSet: global.WeakSet,
    Promise: global.Promise,
    Proxy: global.Proxy,
    Reflect: global.Reflect,

    // Additional globals
    parseInt: global.parseInt,
    parseFloat: global.parseFloat,
    isNaN: global.isNaN,
    isFinite: global.isFinite,
    encodeURI: global.encodeURI,
    decodeURI: global.decodeURI,
    encodeURIComponent: global.encodeURIComponent,
    decodeURIComponent: global.decodeURIComponent,
    BigInt: global.BigInt,
    URL: global.URL,
    URLSearchParams: global.URLSearchParams,
    TextEncoder: global.TextEncoder,
    TextDecoder: global.TextDecoder,
    atob: global.atob,
    btoa: global.btoa
  };

  mixinTypedArrays(scriptContext);

  return scriptContext;
}

module.exports = {
  runScriptInNodeVm
};
