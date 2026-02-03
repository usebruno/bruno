const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const nodeModule = require('node:module');

const { isBuiltinModule, isPathWithinAllowedRoots } = require('./utils');

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
 * Creates a custom require function with enhanced security and local module support
 * @param {Object} options - Configuration options
 * @returns {Function} Custom require function
 */
function createCustomRequire({
  collectionPath,
  scriptContext,
  currentModuleDir = collectionPath,
  localModuleCache = new Map(),
  additionalContextRootsAbsolute = []
}) {
  return (moduleName) => {
    // 1. Handle local modules (./path, ../path)
    const normalizedModuleName = moduleName.replace(/\\/g, '/');
    if (normalizedModuleName.startsWith('./') || normalizedModuleName.startsWith('../')) {
      return loadLocalModule({
        moduleName: normalizedModuleName,
        collectionPath,
        scriptContext,
        localModuleCache,
        currentModuleDir,
        additionalContextRootsAbsolute
      });
    }

    // 2. Handle Node.js builtin modules
    // Note: Builtins are loaded via native require, bypassing VM isolation.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for builtins.
    if (isBuiltinModule(moduleName)) {
      return require(moduleName);
    }

    // 3. Handle npm modules - load INTO vm context
    return loadNpmModule({
      moduleName,
      collectionPath,
      scriptContext,
      localModuleCache
    });
  };
}

/**
 * Loads a local module from the filesystem with security checks and caching
 * @param {Object} options - Configuration options
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
  // Validate the raw module name doesn't try to escape allowed roots
  const preliminaryPath = path.resolve(currentModuleDir, moduleName);
  if (!isPathWithinAllowedRoots(path.normalize(preliminaryPath), additionalContextRootsAbsolute)) {
    const allowedRootsDisplay = additionalContextRootsAbsolute.map((root) => `  - ${root}`).join('\n');
    throw new Error(
      `Access to files outside of the allowed context roots is not allowed: ${moduleName}\n\n`
      + `Allowed context roots:\n${allowedRootsDisplay}`
    );
  }

  // Resolve the module path, handling files and directories
  const normalizedFilePath = resolveLocalModulePath(currentModuleDir, moduleName);

  // Final security check after resolution
  if (!isPathWithinAllowedRoots(normalizedFilePath, additionalContextRootsAbsolute)) {
    const allowedRootsDisplay = additionalContextRootsAbsolute.map((root) => `  - ${root}`).join('\n');
    throw new Error(
      `Access to files outside of the allowed context roots is not allowed: ${moduleName}\n\n`
      + `Allowed context roots:\n${allowedRootsDisplay}`
    );
  }

  // Check cache
  if (localModuleCache.has(normalizedFilePath)) {
    return localModuleCache.get(normalizedFilePath);
  }

  if (!fs.existsSync(normalizedFilePath)) {
    throw new Error(`Cannot find module ${moduleName}`);
  }

  const moduleCode = fs.readFileSync(normalizedFilePath, 'utf8');
  const moduleObj = { exports: {} };
  const moduleDir = path.dirname(normalizedFilePath);

  // Create require function for nested imports
  const moduleRequire = createCustomRequire({
    collectionPath,
    scriptContext,
    currentModuleDir: moduleDir,
    localModuleCache,
    additionalContextRootsAbsolute
  });

  try {
    const moduleFunction = vm.compileFunction(moduleCode, ['module', 'exports', 'require', '__filename', '__dirname'], {
      filename: normalizedFilePath,
      contextExtensions: [scriptContext]
    });
    moduleFunction(moduleObj, moduleObj.exports, moduleRequire, normalizedFilePath, moduleDir);
    localModuleCache.set(normalizedFilePath, moduleObj.exports);
    return moduleObj.exports;
  } catch (error) {
    throw new Error(`Error loading local module ${moduleName}: ${error.message}`);
  }
}

/**
 * Executes a module in the VM context with caching and special file handling
 * @param {Object} options - Configuration options
 * @returns {*} The exported content of the loaded module
 * @throws {Error} When module cannot be loaded
 */
function executeModuleInVmContext({
  resolvedPath,
  moduleName,
  scriptContext,
  collectionPath,
  localModuleCache
}) {
  // Check cache
  if (localModuleCache.has(resolvedPath)) {
    return localModuleCache.get(resolvedPath);
  }

  // Native modules (.node files) - fall back to host require
  // Note: This bypasses VM isolation for native addons.
  // This is intentional - [`developer` mode] node-vm isolation need not be strict for native modules.
  if (resolvedPath.endsWith('.node')) {
    const result = require(resolvedPath);
    localModuleCache.set(resolvedPath, result);
    return result;
  }

  // JSON files - parse directly
  if (resolvedPath.endsWith('.json')) {
    const jsonContent = fs.readFileSync(resolvedPath, 'utf8');
    const result = JSON.parse(jsonContent);
    localModuleCache.set(resolvedPath, result);
    return result;
  }

  // JavaScript files
  const moduleSource = fs.readFileSync(resolvedPath, 'utf8');
  const moduleDir = path.dirname(resolvedPath);
  const moduleObj = { exports: {} };

  const moduleRequire = createNpmModuleRequire({
    collectionPath,
    scriptContext,
    currentModuleDir: moduleDir,
    localModuleCache
  });

  try {
    const moduleFunction = vm.compileFunction(moduleSource, ['module', 'exports', 'require', '__filename', '__dirname'], {
      filename: resolvedPath,
      contextExtensions: [scriptContext]
    });
    moduleFunction(moduleObj, moduleObj.exports, moduleRequire, resolvedPath, moduleDir);
  } catch (error) {
    const stack = error.stack || '';
    throw new Error(`Error loading module ${moduleName}: ${error.message}\nStack: ${stack}`);
  }

  localModuleCache.set(resolvedPath, moduleObj.exports);
  return moduleObj.exports;
}

/**
 * Loads an npm module into the vm context
 * @param {Object} options - Configuration options
 * @returns {*} The exported content of the loaded module
 * @throws {Error} When module cannot be resolved or loaded
 */
function loadNpmModule({
  moduleName,
  collectionPath,
  scriptContext,
  localModuleCache
}) {
  let resolvedPath;

  // Module resolution order:
  // 1. Collection's node_modules (user-installed packages for their collection)
  // 2. Bruno's node_modules (fallback for built-in dependencies)
  //
  // This order ensures user packages take precedence, allowing users to:
  // - Override Bruno's bundled package versions
  // - Install collection-specific dependencies
  if (collectionPath) {
    try {
      const collectionRequire = nodeModule.createRequire(path.join(collectionPath, 'package.json'));
      resolvedPath = collectionRequire.resolve(moduleName);
    } catch {
      // Module not found in collection, continue to fallback
    }
  }

  // Fall back to Bruno's node_modules
  if (!resolvedPath) {
    try {
      resolvedPath = require.resolve(moduleName, { paths: module.paths });
    } catch (mainError) {
      throw new Error(
        `Could not resolve module "${moduleName}": ${mainError.message}\n\n`
        + `Install it with: npm install ${moduleName}`
      );
    }
  }

  return executeModuleInVmContext({
    resolvedPath,
    moduleName,
    scriptContext,
    collectionPath,
    localModuleCache
  });
}

/**
 * Creates require function for npm module dependencies
 * @param {Object} options - Configuration options
 * @returns {Function} Custom require function for npm module dependencies
 */
function createNpmModuleRequire({
  collectionPath,
  scriptContext,
  currentModuleDir,
  localModuleCache
}) {
  const moduleRequire = nodeModule.createRequire(path.join(currentModuleDir, 'index.js'));

  return (moduleName) => {
    // Handle relative imports within npm module
    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      const resolvedPath = moduleRequire.resolve(moduleName);
      return executeModuleInVmContext({
        resolvedPath,
        moduleName,
        scriptContext,
        collectionPath,
        localModuleCache
      });
    }

    // Handle builtins
    // Note: Builtins are loaded via native require, bypassing VM isolation.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for builtins.
    if (isBuiltinModule(moduleName)) {
      return require(moduleName);
    }

    // Handle npm dependencies - resolve from current module's directory
    const resolvedPath = moduleRequire.resolve(moduleName);
    return executeModuleInVmContext({
      resolvedPath,
      moduleName,
      scriptContext,
      collectionPath,
      localModuleCache
    });
  };
}

module.exports = {
  createCustomRequire
};
