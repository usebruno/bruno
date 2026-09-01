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

/**
 * Resolve the VM filename for the script
 * @param {string|null} scriptPath - Path to the source file
 * @param {string} collectionPath - Path to the collection directory
 * @returns {string} Absolute path to use as the VM filename
 */
function resolveVmFilename(scriptPath, collectionPath) {
  if (scriptPath) {
    return path.isAbsolute(scriptPath) ? scriptPath : path.join(collectionPath, scriptPath);
  }
  return path.join(collectionPath, 'script.js');
}

/**
 * Break host-side references to a script VM context so V8 can reclaim it.
 * Node has no vm.disposeContext(); clearing the context object and module
 * cache is the best available hook (same idea as QuickJS context.dispose()).
 *
 * @param {Object|null|undefined} scriptContext - The context global object
 * @param {Map|null|undefined} localModuleCache - Per-run module cache
 */
function releaseScriptContext(scriptContext, localModuleCache) {
  if (localModuleCache) {
    for (const entry of localModuleCache.values()) {
      if (entry && typeof entry === 'object' && 'exports' in entry) {
        entry.exports = undefined;
      }
    }
    localModuleCache.clear();
  }

  if (!scriptContext || typeof scriptContext !== 'object') {
    return;
  }

  // Break circular global/globalThis references before deleting other keys.
  scriptContext.global = undefined;
  scriptContext.globalThis = undefined;
  scriptContext.require = undefined;

  for (const key of Reflect.ownKeys(scriptContext)) {
    try {
      delete scriptContext[key];
    } catch {
      scriptContext[key] = undefined;
    }
  }
}

/**
 * Wrap a release callback so it only runs once.
 * @param {Function|null|undefined} releaseFn
 * @returns {Function|undefined}
 */
function createReleaseOnce(releaseFn) {
  if (typeof releaseFn !== 'function') {
    return undefined;
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    releaseFn();
  };
}

class ScriptError extends Error {
  constructor(error, script) {
    super(error.message);
    this.name = 'ScriptError';
    this.originalError = error;
    this.script = script;
    this.stack = error.stack;
    this.__callSites = error.__callSites || null;
  }
}

module.exports = {
  isBuiltinModule,
  isPathWithinAllowedRoots,
  resolveVmFilename,
  releaseScriptContext,
  createReleaseOnce,
  ScriptError
};
