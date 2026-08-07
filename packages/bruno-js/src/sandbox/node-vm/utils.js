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
  resolveVmFilename,
  ScriptError
};
