const vm = require('node:vm');
const path = require('node:path');
const { get } = require('lodash');
const lodash = require('lodash');
const { wrapConsoleWithSerializers } = require('./console');
const { ScriptError, resolveVmFilename } = require('./utils');
const { createCustomRequire } = require('./cjs-loader');
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

  let pmApiWarnings = [];

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
    pmApiWarnings = scriptContext.__pmApiWarnings;

    // Create truly isolated context - scriptContext becomes the global object
    // Scripts can ONLY access what's explicitly in scriptContext
    const isolatedContext = vm.createContext(scriptContext);

    // Add global/globalThis pointing to the isolated context (not host global)
    // This allows libraries that reference 'global' to work while maintaining isolation
    scriptContext.global = scriptContext;
    scriptContext.globalThis = scriptContext;

    // Create module cache for CJS modules
    const localModuleCache = new Map();

    // Add require() function for CJS module loading
    scriptContext.require = createCustomRequire({
      collectionPath,
      isolatedContext,
      currentModuleDir: collectionPath,
      localModuleCache,
      additionalContextRootsAbsolute
    });

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
      await compiledScript.runInContext(isolatedContext, {
        displayErrors: true
      });
    } catch (error) {
      // V8 invokes prepareStackTrace lazily on first .stack access.
      // Reading .stack here so custom handler runs and populates error.__callSites
      // (used later by the error formatter to map stack frames to the .bru/.yml script)
      void error.stack;
      throw error;
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }

    return { pmApiWarnings };
  } catch (error) {
    error.pmApiWarnings = pmApiWarnings;
    throw new ScriptError(error, script);
  }
}

/**
 * Creates a Proxy that records warnings for any untranslated Postman API usage.
 * Returns undefined and collects accessed API paths into the warnings array.
 */
function createPmProxy(baseName, warningsArray) {
  return new Proxy(function () {}, {
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      const fullPath = baseName + '.' + prop;
      recordPmWarning(fullPath, warningsArray);
      return createPmProxy(fullPath, warningsArray);
    },
    apply(target, thisArg, args) {
      recordPmWarning(baseName, warningsArray);
      return undefined;
    },
    construct(target, args) {
      recordPmWarning(baseName, warningsArray);
      return {};
    },
    set(target, prop, value) {
      recordPmWarning(baseName + '.' + prop, warningsArray);
      return true;
    },
    has(target, prop) {
      return false;
    },
    ownKeys(target) {
      return [];
    }
  });
}

function recordPmWarning(path, warningsArray) {
  // Already recorded
  if (warningsArray.includes(path)) return;
  // A deeper path is already recorded — this is just an intermediate access
  if (warningsArray.some((w) => w.startsWith(path + '.'))) return;
  // Remove any shallower prefixes that this path supersedes
  const filtered = warningsArray.filter((w) => !path.startsWith(w + '.'));
  warningsArray.length = 0;
  warningsArray.push(...filtered, path);
}

/**
 * Build the script context with Bruno objects and necessary globals
 * @param {Object} context - Bruno context (bru, req, res, etc.)
 * @param {Object} scriptingConfig - Scripting configuration
 * @returns {Object} Script context object
 */
function buildScriptContext(context, scriptingConfig) {
  const pmApiWarnings = [];

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
    ),

    // Warnings array for untranslated Postman API usage
    __pmApiWarnings: pmApiWarnings
  };

  // Proxy-based guards for untranslated Postman APIs
  scriptContext.pm = createPmProxy('pm', pmApiWarnings);
  scriptContext.postman = createPmProxy('postman', pmApiWarnings);

  // Add TypedArrays from host for compatibility with host APIs (TextEncoder, crypto, etc.)
  mixinTypedArrays(scriptContext);

  return scriptContext;
}

module.exports = {
  runScriptInNodeVm
};
