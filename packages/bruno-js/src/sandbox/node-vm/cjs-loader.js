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
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.isolatedContext - The VM isolated context created with vm.createContext()
 * @param {string} options.currentModuleDir - Current module directory for resolving relative paths
 * @param {Map} options.localModuleCache - Cache for loaded modules
 * @param {string[]} options.additionalContextRootsAbsolute - Additional allowed root paths
 * @returns {Function} Custom require function
 */
function createCustomRequire({
  collectionPath,
  isolatedContext,
  currentModuleDir = collectionPath,
  localModuleCache = new Map(),
  additionalContextRootsAbsolute = []
}) {
  return (moduleName) => {
    const normalizedModuleName = moduleName.replace(/\\/g, '/');

    // 1. Handle local modules (./path, ../path)
    if (normalizedModuleName.startsWith('./') || normalizedModuleName.startsWith('../')) {
      return loadLocalModule({
        moduleName: normalizedModuleName,
        collectionPath,
        isolatedContext,
        localModuleCache,
        currentModuleDir,
        additionalContextRootsAbsolute
      });
    }

    // 2. Handle absolute paths - route through local module security checks
    // This prevents bypassing additionalContextRoots by using absolute paths
    if (path.isAbsolute(normalizedModuleName)) {
      return loadLocalModule({
        moduleName: normalizedModuleName,
        collectionPath,
        isolatedContext,
        localModuleCache,
        currentModuleDir,
        additionalContextRootsAbsolute
      });
    }

    // 3. Handle Node.js builtin modules
    // Note: Builtins are loaded via native require, bypassing VM isolation.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for builtins.
    if (isBuiltinModule(moduleName)) {
      return require(moduleName);
    }

    // 4. Handle npm modules - load INTO vm context
    return loadNpmModule({
      moduleName,
      collectionPath,
      currentModuleDir,
      isolatedContext,
      localModuleCache,
      additionalContextRootsAbsolute
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
  isolatedContext,
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

  // Check cache - we cache moduleObj, return its exports
  if (localModuleCache.has(normalizedFilePath)) {
    return localModuleCache.get(normalizedFilePath).exports;
  }

  if (!fs.existsSync(normalizedFilePath)) {
    throw new Error(`Cannot find module ${moduleName}`);
  }

  const moduleCode = fs.readFileSync(normalizedFilePath, 'utf8');
  const moduleObj = { exports: {} };
  const moduleDir = path.dirname(normalizedFilePath);

  // Pre-populate cache with moduleObj BEFORE execution to handle circular dependencies
  // This allows re-entrant requires to get partial exports (Node.js behavior)
  // We cache moduleObj (not moduleObj.exports) so that module.exports reassignment works
  localModuleCache.set(normalizedFilePath, moduleObj);

  // Create require function for nested imports
  const moduleRequire = createCustomRequire({
    collectionPath,
    isolatedContext,
    currentModuleDir: moduleDir,
    localModuleCache,
    additionalContextRootsAbsolute
  });

  try {
    // Wrap module code in a function that receives CJS parameters
    const wrappedCode = `(function(module, exports, require, __filename, __dirname) {\n${moduleCode}\n})`;
    const compiledScript = new vm.Script(wrappedCode, { filename: normalizedFilePath });
    const moduleFunction = compiledScript.runInContext(isolatedContext);
    moduleFunction(moduleObj, moduleObj.exports, moduleRequire, normalizedFilePath, moduleDir);
    return moduleObj.exports;
  } catch (error) {
    // Remove failed module from cache to allow retry
    localModuleCache.delete(normalizedFilePath);
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
  isolatedContext,
  collectionPath,
  localModuleCache,
  additionalContextRootsAbsolute = []
}) {
  // Check cache - we cache moduleObj, return its exports
  if (localModuleCache.has(resolvedPath)) {
    return localModuleCache.get(resolvedPath).exports;
  }

  // Native modules (.node files) - fall back to host require
  // Note: This bypasses VM isolation for native addons.
  // This is intentional - [`developer` mode] node-vm isolation need not be strict for native modules.
  if (resolvedPath.endsWith('.node')) {
    const result = require(resolvedPath);
    // Wrap in moduleObj format for consistent cache retrieval
    localModuleCache.set(resolvedPath, { exports: result });
    return result;
  }

  // JSON files - parse directly
  if (resolvedPath.endsWith('.json')) {
    const jsonContent = fs.readFileSync(resolvedPath, 'utf8');
    const result = JSON.parse(jsonContent);
    // Wrap in moduleObj format for consistent cache retrieval
    localModuleCache.set(resolvedPath, { exports: result });
    return result;
  }

  // JavaScript files
  const moduleSource = fs.readFileSync(resolvedPath, 'utf8');
  const moduleDir = path.dirname(resolvedPath);
  const moduleObj = { exports: {} };

  // Pre-populate cache with moduleObj BEFORE execution to handle circular dependencies
  // This allows re-entrant requires to get partial exports (Node.js behavior)
  // We cache moduleObj (not moduleObj.exports) so that module.exports reassignment works
  localModuleCache.set(resolvedPath, moduleObj);

  const moduleRequire = createNpmModuleRequire({
    collectionPath,
    isolatedContext,
    currentModuleDir: moduleDir,
    localModuleCache,
    additionalContextRootsAbsolute
  });

  try {
    // Wrap module code in a function that receives CJS parameters
    const wrappedCode = `(function(module, exports, require, __filename, __dirname) {\n${moduleSource}\n})`;
    const compiledScript = new vm.Script(wrappedCode, { filename: resolvedPath });
    const moduleFunction = compiledScript.runInContext(isolatedContext);
    moduleFunction(moduleObj, moduleObj.exports, moduleRequire, resolvedPath, moduleDir);
  } catch (error) {
    // Remove failed module from cache to allow retry
    localModuleCache.delete(resolvedPath);
    const stack = error.stack || '';
    throw new Error(`Error loading module ${moduleName}: ${error.message}\nStack: ${stack}`);
  }

  return moduleObj.exports;
}

/**
 * Compare a Node-resolved npm module path against allowed roots.
 *
 * Node's `createRequire(...).resolve(...)` returns realpath'd paths (macOS resolves
 * `/var → /private/var` for temp/symlinked dirs). If the allowed roots come in as
 * unresolved symlinks, a naive `path.relative` comparison produces false negatives.
 * Canonicalize the roots so both sides are in the same physical form before checking.
 *
 * @param {string} candidatePath - Path returned by Node's resolver (already realpath'd)
 * @param {string[]} additionalContextRootsAbsolute - Allowed root directories
 * @returns {boolean} True if candidate sits inside any allowed root
 */
function isResolvedNpmPathAllowed(candidatePath, additionalContextRootsAbsolute) {
  const canonicalRoots = additionalContextRootsAbsolute.map((root) => {
    try {
      return fs.realpathSync(root);
    } catch {
      return path.normalize(root);
    }
  });
  return isPathWithinAllowedRoots(candidatePath, canonicalRoots);
}

/**
 * Trust any npm package the user (or npm) placed inside an allowed root's
 * node_modules/ — even if it's a symlink pointing outside allowed roots
 * (npm link / file: dependencies). The presence of the entry itself is the
 * declaration of trust, matching how any Node.js runtime resolves it.
 *
 * The candidatePath must actually correspond to that entry (same realpath'd
 * target), otherwise a walk-up match on an unrelated ancestor package with
 * the same name would be silently accepted.
 *
 * @param {string} candidatePath - The resolved path being checked
 * @param {string} moduleName - Bare npm module name (may include a scope)
 * @param {string[]} additionalContextRootsAbsolute - Allowed root directories
 * @returns {boolean} True if candidatePath is inside a root's node_modules/<name>
 */
function isModuleLinkedFromAllowedRoot(candidatePath, moduleName, additionalContextRootsAbsolute) {
  for (const root of additionalContextRootsAbsolute) {
    const linkPath = path.join(root, 'node_modules', moduleName);
    try {
      const linkTarget = fs.realpathSync(linkPath);
      const rel = path.relative(linkTarget, candidatePath);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        return true;
      }
    } catch {
      // Not present in this root's node_modules, try next
    }
  }
  return false;
}

/**
 * Same as isResolvedNpmPathAllowed but also permits Bruno's own bundled
 * node_modules hierarchy. Used for transitive requires made from inside a
 * loaded npm package — e.g. chai/ajv/axios resolving their internal deps —
 * which must be able to reach into Bruno's install directory that isn't a
 * user-declared context root.
 */
function isTransitiveNpmPathAllowed(candidatePath, additionalContextRootsAbsolute) {
  return isResolvedNpmPathAllowed(
    candidatePath,
    [...additionalContextRootsAbsolute, ...module.paths]
  );
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
  currentModuleDir,
  isolatedContext,
  localModuleCache,
  additionalContextRootsAbsolute = []
}) {
  let resolvedPath;

  // Module resolution order (standard Node.js walk-up, bounded by allowed roots):
  // 1. currentModuleDir/node_modules → walk up parent dirs (security-checked)
  // 2. Additional context roots' node_modules (cross-root discovery)
  // 3. Collection's node_modules
  // 4. Bruno's node_modules (final fallback)
  //
  // Step 1 uses Node's built-in resolution from the calling module's directory,
  // matching how native require() behaves. Resolved paths must land inside an
  // allowed root — otherwise the walk-up could escape to system node_modules.
  if (currentModuleDir) {
    try {
      const callerRequire = nodeModule.createRequire(path.join(currentModuleDir, 'package.json'));
      const candidatePath = path.normalize(callerRequire.resolve(moduleName));
      if (isResolvedNpmPathAllowed(candidatePath, additionalContextRootsAbsolute)
        || isModuleLinkedFromAllowedRoot(candidatePath, moduleName, additionalContextRootsAbsolute)) {
        resolvedPath = candidatePath;
      }
    } catch {
      // Not found via walk-up, continue to fallbacks
    }
  }

  // Search additional context roots' node_modules (top-level, for cross-root discovery)
  if (!resolvedPath) {
    for (const contextRoot of additionalContextRootsAbsolute) {
      if (collectionPath && path.normalize(contextRoot) === path.normalize(collectionPath)) {
        continue;
      }
      try {
        const contextRequire = nodeModule.createRequire(path.join(contextRoot, 'package.json'));
        const candidatePath = path.normalize(contextRequire.resolve(moduleName));
        // Node's walk-up from contextRoot goes up to /; gate the result so we don't
        // accept packages found in ancestor directories outside allowed roots.
        // Also accept file:/npm-link symlinks that live in the root's node_modules.
        if (isResolvedNpmPathAllowed(candidatePath, additionalContextRootsAbsolute)
          || isModuleLinkedFromAllowedRoot(candidatePath, moduleName, additionalContextRootsAbsolute)) {
          resolvedPath = candidatePath;
          break;
        }
      } catch {
        // Module not found in this context root, try next
      }
    }
  }

  // Fall back to collection's node_modules
  if (!resolvedPath && collectionPath) {
    try {
      const collectionRequire = nodeModule.createRequire(path.join(collectionPath, 'package.json'));
      const candidatePath = path.normalize(collectionRequire.resolve(moduleName));
      // Node's walk-up doesn't stop at collectionPath; gate the result so we don't
      // silently accept packages from ancestor directories outside allowed roots.
      // Also accept file:/npm-link symlinks that live in the collection's node_modules.
      if (isResolvedNpmPathAllowed(candidatePath, additionalContextRootsAbsolute)
        || isModuleLinkedFromAllowedRoot(candidatePath, moduleName, additionalContextRootsAbsolute)) {
        resolvedPath = candidatePath;
      }
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
    isolatedContext,
    collectionPath,
    localModuleCache,
    additionalContextRootsAbsolute
  });
}

/**
 * Creates require function for npm module dependencies
 * @param {Object} options - Configuration options
 * @returns {Function} Custom require function for npm module dependencies
 */
function createNpmModuleRequire({
  collectionPath,
  isolatedContext,
  currentModuleDir,
  localModuleCache,
  additionalContextRootsAbsolute = []
}) {
  const moduleRequire = nodeModule.createRequire(path.join(currentModuleDir, 'package.json'));

  const gatedResolve = (moduleName) => {
    const candidatePath = path.normalize(moduleRequire.resolve(moduleName));
    if (!isTransitiveNpmPathAllowed(candidatePath, additionalContextRootsAbsolute)) {
      throw new Error(
        `Access to module "${moduleName}" outside allowed roots is not allowed`
      );
    }
    return candidatePath;
  };

  return (moduleName) => {
    // Handle relative imports within npm module
    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      const resolvedPath = gatedResolve(moduleName);
      return executeModuleInVmContext({
        resolvedPath,
        moduleName,
        isolatedContext,
        collectionPath,
        localModuleCache,
        additionalContextRootsAbsolute
      });
    }

    // Handle builtins
    // Note: Builtins are loaded via native require, bypassing VM isolation.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for builtins.
    if (isBuiltinModule(moduleName)) {
      return require(moduleName);
    }

    // Handle npm dependencies - resolve from current module's directory
    const resolvedPath = gatedResolve(moduleName);
    return executeModuleInVmContext({
      resolvedPath,
      moduleName,
      isolatedContext,
      collectionPath,
      localModuleCache,
      additionalContextRootsAbsolute
    });
  };
}

module.exports = {
  createCustomRequire
};
