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
    argv: process.argv,
    title: process.title,
    version: process.version,
    versions: process.versions,
    arch: process.arch,
    platform: process.platform,
    env: {}, // Empty by default
    pid: process.pid,
    features: process.features
  };
}

module.exports = {
  isBuiltinModule,
  isPathWithinAllowedRoots,
  ScriptError,
  buildSanitizedProcess
};
