const fs = require('node:fs');
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
 * Resolve a local module path, handling files and directories
 * Follows Node.js resolution algorithm:
 * 1. Exact path (with extension)
 * 2. Path + .js extension
 * 3. Directory with package.json (main field)
 * 4. Directory with index.js
 * @param {string} fromDir - Directory to resolve from
 * @param {string} moduleName - Module name/path
 * @returns {string} Resolved absolute path
 */
function resolveLocalModulePath(fromDir, moduleName) {
  const basePath = path.resolve(fromDir, moduleName);

  // 1. If has extension, use as-is
  if (path.extname(moduleName)) {
    return path.normalize(basePath);
  }

  // 2. Try with .js extension
  const withJs = basePath + '.js';
  if (fs.existsSync(withJs)) {
    return path.normalize(withJs);
  }

  // 3. Check if it's a directory
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    // 3a. Check for package.json with main field
    const pkgPath = path.join(basePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.main) {
          const mainPath = path.resolve(basePath, pkg.main);
          if (fs.existsSync(mainPath)) {
            return path.normalize(mainPath);
          }
        }
      } catch {
        // Ignore JSON parse errors, fall through to index.js
      }
    }

    // 3b. Check for index.js
    const indexPath = path.join(basePath, 'index.js');
    if (fs.existsSync(indexPath)) {
      return path.normalize(indexPath);
    }
  }

  // 4. Fall back to original path (will likely fail with file not found)
  return path.normalize(basePath);
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
  isPathWithinAllowedRoots,
  resolveLocalModulePath,
  resolveVmFilename,
  ScriptError
};
