const vm = require('node:vm');
const path = require('node:path');
const { get } = require('lodash');
const lodash = require('lodash');
const { wrapConsoleWithSerializers } = require('./console');
const { ScriptError, resolveVmFilename } = require('./utils');
const { createCustomRequire, runWithScriptContext, getSharedNpmContext } = require('./cjs-loader');
const { safeGlobals } = require('./constants');
const { mixinTypedArrays } = require('../mixins/typed-arrays');
const { wrapScriptInClosure, SANDBOX } = require('../../utils/sandbox');

/**
 * Executes a script in a Node.js VM context with enhanced security and module loading
 *
 * @param {Object} options - Configuration options
 * @param {string} options.script - The script code to execute
 * @param {Object} options.context - The execution context with Bruno objects
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.scriptingConfig - Scripting configuration options
 * @param {string} [options.scriptPath] - Path to the source file for accurate stack traces
 * @returns {Promise<Object>} Execution results including variables and test results
 * @throws {ScriptError} When script execution fails
 */
async function runScriptInNodeVm({
  script,
  context,
  collectionPath,
  scriptingConfig,
  scriptPath
}) {
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
    const localModuleCache = new Map();
    const cacheModules = get(scriptingConfig, 'cacheModules', false) === true;

    // cacheModules: one shared VM realm for scripts + npm modules so instanceof
    // matches. Per-run bru/req/res/require resolve via ALS facades on that realm.
    // Otherwise: fresh isolated context per script (default).
    let vmContext;
    if (cacheModules) {
      vmContext = getSharedNpmContext();
    } else {
      vmContext = vm.createContext(scriptContext);
      scriptContext.global = scriptContext;
      scriptContext.globalThis = scriptContext;
    }

    scriptContext.require = createCustomRequire({
      collectionPath,
      isolatedContext: vmContext,
      currentModuleDir: collectionPath,
      localModuleCache,
      additionalContextRootsAbsolute,
      cacheModules
    });
    // Stashed for shared npm requires that outlive this run's createCustomRequire closure.
    scriptContext.__brunoLocalModuleCache = localModuleCache;
    scriptContext.__brunoVmContext = vmContext;

    // cacheModules: onFail runs after the script's ALS store exits, so re-bind
    // registered callbacks to this run's context (bru/req/... facades).
    let restoreOnFail;
    if (cacheModules && typeof scriptContext.req?.onFail === 'function') {
      const req = scriptContext.req;
      const originalOnFail = req.onFail.bind(req);
      req.onFail = (callback) => {
        if (typeof callback !== 'function') {
          return originalOnFail(callback);
        }
        return originalOnFail((error) => runWithScriptContext(scriptContext, () => callback(error)));
      };
      restoreOnFail = () => {
        req.onFail = originalOnFail;
      };
    }

    const vmFilename = resolveVmFilename(scriptPath, collectionPath);

    // Execute the script in the isolated context
    const wrappedScript = wrapScriptInClosure(script, SANDBOX.NODEVM);
    let compiledScript;
    try {
      compiledScript = new vm.Script(wrappedScript, {
        filename: vmFilename
      });
    } catch (error) {
      // V8 puts "filename:line" as the first line of syntax error stacks.
      // Parse it so the error formatter can map to the correct source location.
      const firstLine = error.stack?.split('\n')[0];
      const match = firstLine?.match(/^(.+):(\d+)$/);
      if (match && match[1] === vmFilename) {
        error.__callSites = [{
          filePath: vmFilename,
          line: parseInt(match[2], 10),
          column: null,
          functionName: null
        }];
      }
      throw error;
    }

    // Capture structured call sites for error-formatter line mapping
    const originalPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (error, callSites) => {
      error.__callSites = callSites
        .filter((site) => site.getFileName() === vmFilename)
        .map((site) => ({
          filePath: site.getFileName(),
          line: site.getLineNumber(),
          column: site.getColumnNumber(),
          functionName: site.getFunctionName() || null
        }));

      return error.toString() + '\n' + callSites
        .map((site) => `    at ${site}`)
        .join('\n');
    };

    try {
      const runScript = () => compiledScript.runInContext(vmContext, {
        displayErrors: true
      });
      if (cacheModules) {
        await runWithScriptContext(scriptContext, runScript);
      } else {
        await runScript();
      }
    } catch (error) {
      // V8 invokes prepareStackTrace lazily on first .stack access.
      // Reading .stack here so custom handler runs and populates error.__callSites
      // (used later by the error formatter to map stack frames to the .bru/.yml script)
      void error.stack;
      throw error;
    } finally {
      restoreOnFail?.();
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
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
    ...context,

    // Bruno context (wrap console with Set/Map support)
    console: wrapConsoleWithSerializers(context.console),

    // Configuration for nested module loading
    scriptingConfig: scriptingConfig,

    // Safe globals from allowlist (Node.js/Web APIs only, not ECMAScript built-ins)
    ...Object.fromEntries(
      safeGlobals
        .filter((key) => global[key] !== undefined)
        .map((key) => [key, global[key]])
    )
  };

  // Add TypedArrays from host for compatibility with host APIs (TextEncoder, crypto, etc.)
  mixinTypedArrays(scriptContext);

  return scriptContext;
}

module.exports = {
  runScriptInNodeVm
};
