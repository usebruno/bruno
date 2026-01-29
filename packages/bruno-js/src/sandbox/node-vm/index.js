const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { get } = require('lodash');
const lodash = require('lodash');
const { mixinTypedArrays } = require('../mixins/typed-arrays');

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
 * Executes a script in a Node.js VM context with enhanced security and module loading
 * @param {Object} options - Configuration options
 * @param {string} options.script - The script code to execute
 * @param {Object} options.context - The execution context with Bruno objects
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.scriptingConfig - Scripting configuration options
 * @returns {Promise<Object>} Execution results including variables and test results
 * @throws {ScriptError} When script execution fails
 */
async function runScriptInNodeVm({
  script,
  context,
  collectionPath,
  scriptingConfig
}) {
  if (script.trim().length === 0) {
    return;
  }

  try {
    // Compute additional context roots
    const additionalContextRoots = get(scriptingConfig, 'additionalContextRoots', []);
    const additionalContextRootsAbsolute = lodash
      .chain(additionalContextRoots)
      .map((acr) => (path.isAbsolute(acr) ? acr : path.join(collectionPath, acr)))
      .map((acr) => path.normalize(acr))
      .value();
    additionalContextRootsAbsolute.push(path.normalize(collectionPath));

    // Create script context with all necessary variables
    const scriptContext = {
      // Bruno context
      console: context.console,
      req: context.req,
      res: context.res,
      bru: context.bru,
      expect: context.expect,
      assert: context.assert,
      __brunoTestResults: context.__brunoTestResults,
      test: context.test,
      // Configuration for nested module loading
      scriptingConfig: scriptingConfig,
      // Global objects
      Buffer: global.Buffer,
      process: global.process,
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      clearTimeout: global.clearTimeout,
      clearInterval: global.clearInterval,
      setImmediate: global.setImmediate,
      clearImmediate: global.clearImmediate,
      Error: global.Error,
      TypeError: global.TypeError,
      ReferenceError: global.ReferenceError,
      SyntaxError: global.SyntaxError,
      RangeError: global.RangeError
    };

    mixinTypedArrays(scriptContext);

    // Create shared cache for local modules
    const localModuleCache = new Map();

    // Create a custom require function and add it to the context
    scriptContext.require = createCustomRequire({
      scriptingConfig,
      collectionPath,
      scriptContext,
      currentModuleDir: collectionPath,
      localModuleCache,
      additionalContextRootsAbsolute
    });

    // Execute the script in an isolated VM context
    await vm.runInNewContext(`
        (async function(){
          ${script}
        })();
      `, scriptContext, {
      filename: path.join(collectionPath, 'script.js'),
      displayErrors: true
    });
  } catch (error) {
    throw new ScriptError(error, script);
  }

  return;
}

/**
 * Creates a custom require function with enhanced security and local module support
 * @param {Object} options - Configuration options
 * @param {Object} options.scriptingConfig - Scripting configuration with additional context roots
 * @param {string} options.collectionPath - Base collection path for security checks
 * @param {Object} options.scriptContext - Script execution context
 * @param {string} options.currentModuleDir - Current module directory for relative imports
 * @param {Map} options.localModuleCache - Cache for loaded local modules
 * @param {Array<string>} options.additionalContextRootsAbsolute - Pre-computed absolute context roots
 * @returns {Function} Custom require function
 */
function createCustomRequire({
  scriptingConfig,
  collectionPath,
  scriptContext,
  currentModuleDir = collectionPath,
  localModuleCache = new Map(),
  additionalContextRootsAbsolute = []
}) {
  return (moduleName) => {
    // Check if it's a local module (starts with ./ or ../ or .\ or ..\)
    // Normalize backslashes to forward slashes for cross-platform compatibility
    const normalizedModuleName = moduleName.replace(/\\/g, '/');
    if (normalizedModuleName.startsWith('./') || normalizedModuleName.startsWith('../')) {
      return loadLocalModule({ moduleName: normalizedModuleName, collectionPath, scriptContext, localModuleCache, currentModuleDir, additionalContextRootsAbsolute });
    }

    // First try to require as a native/npm module
    try {
      const requiredModulePath = require.resolve(moduleName, { paths: [...additionalContextRootsAbsolute, ...module.paths] });
      return require(requiredModulePath);
    } catch (requireError) {
      // If that fails, try to resolve from additionalContextRoots
      throw new Error(`Could not resolve module "${moduleName}": ${requireError.message}\n\nThis most likely means you did not install the module under the collection or the "additionalContextRoots" using a package manager like npm.\n\nThese are your current "additionalContextRoots":\n${additionalContextRootsAbsolute.map((root) => `  - ${root}`).join('\n') || '  - No "additionalContextRoots" defined'}`);
    }
  };
}

/**
 * Loads a local module from the filesystem with security checks and caching
 * @param {Object} options - Configuration options
 * @param {string} options.moduleName - Name/path of the module to load
 * @param {string} options.collectionPath - Base collection path for security validation
 * @param {Object} options.scriptContext - Script execution context to inherit
 * @param {Map} options.localModuleCache - Cache for loaded modules
 * @param {string} options.currentModuleDir - Directory of the current module for relative resolution
 * @param {Array<string>} options.additionalContextRootsAbsolute - Additional allowed context root paths
 * @returns {*} The exported content of the loaded module
 * @throws {Error} When module is outside collection path or cannot be loaded
 */
function loadLocalModule({
  moduleName,
  collectionPath,
  scriptContext,
  localModuleCache,
  currentModuleDir,
  additionalContextRootsAbsolute = []
}) {
  // Check if the filename has an extension
  const hasExtension = path.extname(moduleName) !== '';
  const resolvedFilename = hasExtension ? moduleName : `${moduleName}.js`;

  // Resolve the file path relative to the current module's directory
  const filePath = path.resolve(currentModuleDir, resolvedFilename);
  const normalizedFilePath = path.normalize(filePath);

  const isWithinAllowedRoot = additionalContextRootsAbsolute.some((allowedRoot) => {
    const normalizedAllowedRoot = path.normalize(allowedRoot);
    const relativePath = path.relative(normalizedAllowedRoot, normalizedFilePath);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  });

  if (!isWithinAllowedRoot) {
    const allowedRootsDisplay = additionalContextRootsAbsolute.map((root) => `  - ${root}`).join('\n');
    throw new Error(
      `Access to files outside of the allowed context roots is not allowed: ${moduleName}\n\n`
      + `Allowed context roots:\n${allowedRootsDisplay}`
    );
  }

  // Check cache first (use normalized path as key)
  if (localModuleCache.has(normalizedFilePath)) {
    return localModuleCache.get(normalizedFilePath);
  }

  if (!fs.existsSync(normalizedFilePath)) {
    throw new Error(`Cannot find module ${moduleName}`);
  }

  // Read and execute the local module
  const moduleCode = fs.readFileSync(normalizedFilePath, 'utf8');

  // Create module object
  const moduleObj = { exports: {} };

  // Get the directory of this module for nested imports
  const moduleDir = path.dirname(normalizedFilePath);

  // Create a new context that inherits from the script context
  const moduleContext = {
    ...scriptContext,
    module: moduleObj,
    exports: moduleObj.exports,
    __filename: normalizedFilePath,
    __dirname: moduleDir,
    // Create a custom require function for this module that resolves relative to its directory
    require: createCustomRequire({
      scriptingConfig: scriptContext.scriptingConfig || {},
      collectionPath,
      scriptContext,
      currentModuleDir: moduleDir,
      localModuleCache,
      additionalContextRootsAbsolute
    })
  };

  try {
    // Execute the module code in the shared context
    vm.runInNewContext(moduleCode, moduleContext, {
      filename: normalizedFilePath,
      displayErrors: true
    });

    // Cache the result using normalized path
    localModuleCache.set(normalizedFilePath, moduleObj.exports);

    return moduleObj.exports;
  } catch (error) {
    throw new Error(`Error loading local module ${moduleName}: ${error.message}`);
  }
}

module.exports = {
  runScriptInNodeVm
};
