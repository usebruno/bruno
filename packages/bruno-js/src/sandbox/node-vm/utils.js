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

/**
 * Pre-compiled VM script that wraps getter methods on req, res, and bru
 * to return VM-native objects via JSON round-trip.
 *
 * Host-context objects have different Object/Array constructors than VM-context objects.
 * Libraries like AJV use fast-deep-equal which checks `a.constructor !== b.constructor`,
 * causing deep equality to fail for structurally identical cross-context objects.
 *
 * Running JSON.parse inside the VM creates objects with VM-native prototypes.
 *
 * Affected methods:
 *   res  — getBody(), getHeaders()
 *   req  — getBody(options), getHeaders(), getPathParams(), getTags()
 *   bru  — getVar(key)
 */
const recontextualizeScript = new vm.Script(`
  (function() {
    function toVMNative(val) {
      if (val === null || val === undefined || typeof val !== 'object') return val;
      try { return JSON.parse(JSON.stringify(val)); } catch(e) { return val; }
    }

    function wrapMethod(obj, method) {
      var orig = obj[method].bind(obj);
      obj[method] = function() { return toVMNative(orig.apply(null, arguments)); };
    }

    if (typeof res !== 'undefined' && res) {
      if (typeof res.getBody === 'function') wrapMethod(res, 'getBody');
      if (typeof res.getHeaders === 'function') wrapMethod(res, 'getHeaders');
    }

    if (typeof req !== 'undefined' && req) {
      if (typeof req.getBody === 'function') wrapMethod(req, 'getBody');
      if (typeof req.getHeaders === 'function') wrapMethod(req, 'getHeaders');
      if (typeof req.getPathParams === 'function') wrapMethod(req, 'getPathParams');
      if (typeof req.getTags === 'function') wrapMethod(req, 'getTags');
    }

    if (typeof bru !== 'undefined' && bru) {
      if (typeof bru.getVar === 'function') wrapMethod(bru, 'getVar');
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
