const vm = require('node:vm');
const path = require('node:path');
const { get } = require('lodash');
const lodash = require('lodash');
const { ScriptError } = require('./utils');
const { createCustomRequire } = require('./cjs-loader');
const { safeGlobals } = require('./constants');
const { mixinTypedArrays } = require('../mixins/typed-arrays');

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

    // Execute the script in the isolated context
    const wrappedScript = `(async function(){ ${script} \n})();`;
    const compiledScript = new vm.Script(wrappedScript, {
      filename: path.join(collectionPath, 'script.js')
    });

    await compiledScript.runInContext(isolatedContext);
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
