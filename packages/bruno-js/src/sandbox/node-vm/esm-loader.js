const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const nodeModule = require('node:module');
const { pathToFileURL } = require('node:url');

const { isBuiltinModule, isPathWithinAllowedRoots, resolveLocalModulePath } = require('./utils');
const { createCustomRequire } = require('./cjs-loader');

// ESM modules share the same backing cache map as CJS modules. Prefix keys so a
// CJS require cache entry and an ESM import cache entry for the same file do not collide.
const ESM_CACHE_PREFIX = 'esm:';

/**
 * Creates the dynamic import callback used by vm.Script and vm.SourceTextModule.
 * The callback resolves local files, Node builtins, and npm dependencies through
 * Bruno's allowed-root checks before returning a vm.Module instance.
 * @param {Object} options - Configuration options.
 * @param {string} options.collectionPath - Path to the collection directory.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {string} [options.currentModuleDir=collectionPath] - Directory used to resolve relative imports.
 * @param {Map<string, *>} [options.localModuleCache] - Shared CJS/ESM module cache.
 * @param {string[]} [options.additionalContextRootsAbsolute] - Absolute roots allowed for local module access.
 * @returns {(moduleName: string, referrer?: vm.Module) => Promise<vm.Module>} Custom dynamic import callback.
 */
function createCustomImport({
  collectionPath,
  isolatedContext,
  currentModuleDir = collectionPath,
  localModuleCache = new Map(),
  additionalContextRootsAbsolute = []
}) {
  return async (moduleName, referrer) => {
    const normalizedModuleName = moduleName.replace(/\\/g, '/');
    const referrerDir = getReferrerDir(referrer, currentModuleDir);

    // 1. Handle local modules (./path, ../path)
    if (normalizedModuleName.startsWith('./') || normalizedModuleName.startsWith('../')) {
      return loadLocalModule({
        moduleName: normalizedModuleName,
        collectionPath,
        isolatedContext,
        currentModuleDir: referrerDir,
        localModuleCache,
        additionalContextRootsAbsolute
      });
    }

    // 2. Handle absolute paths - route through local module security checks
    // This prevents bypassing additionalContextRoots by using absolute paths.
    if (path.isAbsolute(normalizedModuleName)) {
      return loadLocalModule({
        moduleName: normalizedModuleName,
        collectionPath,
        isolatedContext,
        currentModuleDir: referrerDir,
        localModuleCache,
        additionalContextRootsAbsolute
      });
    }

    // 3. Handle Node.js builtin modules
    // Note: Builtins are loaded via native require, bypassing VM isolation.
    // This is intentional - [`developer` mode] node-vm isolation need not be strict for builtins.
    if (isBuiltinModule(moduleName)) {
      return loadBuiltinModule({
        moduleName,
        isolatedContext,
        localModuleCache
      });
    }

    // 4. Handle npm modules - resolve collection dependencies before Bruno's bundled dependencies.
    return loadNpmModule({
      moduleName,
      collectionPath,
      isolatedContext,
      localModuleCache,
      additionalContextRootsAbsolute
    });
  };
}

/**
 * Gets the directory imports should resolve from for a referrer module.
 * @param {vm.Module|undefined} referrer - Module requesting the import.
 * @param {string} fallbackDir - Directory used when the referrer has no absolute identifier.
 * @returns {string} Directory for resolving relative import specifiers.
 */
function getReferrerDir(referrer, fallbackDir) {
  if (referrer?.identifier && path.isAbsolute(referrer.identifier)) {
    return path.dirname(referrer.identifier);
  }

  return fallbackDir;
}

/**
 * Loads a local ESM, CJS, or JSON module from the filesystem.
 * The module specifier is checked before and after path resolution so extension
 * inference or package main resolution cannot escape the allowed roots.
 * @param {Object} options - Configuration options.
 * @param {string} options.moduleName - Local or absolute module specifier.
 * @param {string} options.collectionPath - Path to the collection directory.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {string} options.currentModuleDir - Directory used to resolve relative paths.
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @param {string[]} [options.additionalContextRootsAbsolute] - Absolute roots allowed for local module access.
 * @returns {Promise<vm.Module>} VM module instance.
 * @throws {Error} When the module is outside allowed roots or cannot be found.
 */
async function loadLocalModule({
  moduleName,
  collectionPath,
  isolatedContext,
  currentModuleDir,
  localModuleCache,
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
  const resolvedPath = resolveLocalModulePath(currentModuleDir, moduleName);

  // Final security check after resolution
  if (!isPathWithinAllowedRoots(resolvedPath, additionalContextRootsAbsolute)) {
    const allowedRootsDisplay = additionalContextRootsAbsolute.map((root) => `  - ${root}`).join('\n');
    throw new Error(
      `Access to files outside of the allowed context roots is not allowed: ${moduleName}\n\n`
      + `Allowed context roots:\n${allowedRootsDisplay}`
    );
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Cannot find module ${moduleName}`);
  }

  return executeModuleInVmContext({
    resolvedPath,
    moduleName,
    collectionPath,
    isolatedContext,
    localModuleCache,
    additionalContextRootsAbsolute
  });
}

/**
 * Loads a Node.js builtin module and exposes it as a synthetic ESM namespace.
 * @param {Object} options - Configuration options.
 * @param {string} options.moduleName - Builtin module name, with or without the node: prefix.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @returns {Promise<vm.SyntheticModule>} Synthetic VM module for the builtin exports.
 */
async function loadBuiltinModule({
  moduleName,
  isolatedContext,
  localModuleCache
}) {
  const normalizedName = moduleName.replace(/^node:/, '');

  // Dynamic import must resolve to a vm.Module. Builtins are native CommonJS-ish
  // values here, so expose them through a synthetic ESM namespace.
  return createSyntheticModuleFromExports({
    identifier: `node:${normalizedName}`,
    exportsValue: require(moduleName),
    isolatedContext,
    localModuleCache
  });
}

/**
 * Resolves and loads an npm dependency into the VM context.
 * Collection-local dependencies are preferred over Bruno's own dependencies.
 * @param {Object} options - Configuration options.
 * @param {string} options.moduleName - Package specifier to resolve.
 * @param {string} options.collectionPath - Path to the collection directory.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @param {string[]} options.additionalContextRootsAbsolute - Absolute roots allowed for local module access.
 * @returns {Promise<vm.Module>} VM module instance.
 * @throws {Error} When the dependency cannot be resolved or loaded.
 */
async function loadNpmModule({
  moduleName,
  collectionPath,
  isolatedContext,
  localModuleCache,
  additionalContextRootsAbsolute
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
      // Module not found in collection, continue to fallback.
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
    collectionPath,
    isolatedContext,
    localModuleCache,
    additionalContextRootsAbsolute
  });
}

/**
 * Executes or wraps a resolved module path and returns a VM module instance.
 * ESM files are loaded as SourceTextModule instances; CJS and JSON values are
 * bridged into synthetic ESM modules.
 * @param {Object} options - Configuration options.
 * @param {string} options.resolvedPath - Absolute path resolved for the module.
 * @param {string} options.moduleName - Original module specifier.
 * @param {string} options.collectionPath - Path to the collection directory.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @param {string[]} options.additionalContextRootsAbsolute - Absolute roots allowed for local module access.
 * @returns {Promise<vm.Module>} VM module instance.
 * @throws {Error} When the module cannot be loaded.
 */
async function executeModuleInVmContext({
  resolvedPath,
  moduleName,
  collectionPath,
  isolatedContext,
  localModuleCache,
  additionalContextRootsAbsolute
}) {
  // JSON files are exposed as default-only ESM modules, matching Node's import
  // shape closely enough for Bruno scripts without parsing import attributes.
  if (resolvedPath.endsWith('.json')) {
    const jsonValue = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    return createSyntheticModuleFromExports({
      identifier: resolvedPath,
      exportsValue: jsonValue,
      isolatedContext,
      localModuleCache,
      defaultOnly: true
    });
  }

  if (shouldLoadAsEsm(resolvedPath)) {
    return loadSourceTextModule({
      resolvedPath,
      collectionPath,
      isolatedContext,
      localModuleCache,
      additionalContextRootsAbsolute
    });
  }

  const moduleRequire = createCustomRequire({
    collectionPath,
    isolatedContext,
    currentModuleDir: path.dirname(resolvedPath),
    localModuleCache,
    additionalContextRootsAbsolute
  });
  const exportsValue = moduleRequire(resolvedPath);

  // CJS dependencies can still be imported from ESM scripts. Execute them through
  // Bruno's CJS loader, then bridge their exports into a synthetic ESM namespace.
  return createSyntheticModuleFromExports({
    identifier: resolvedPath,
    exportsValue,
    isolatedContext,
    localModuleCache
  });
}

/**
 * Creates, links, evaluates, and caches a real ESM source module.
 * Static imports are delegated back through the custom import resolver so nested
 * dependencies keep the same security and collection-resolution behavior.
 * @param {Object} options - Configuration options.
 * @param {string} options.resolvedPath - Absolute path to the ESM file.
 * @param {string} options.collectionPath - Path to the collection directory.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @param {string[]} options.additionalContextRootsAbsolute - Absolute roots allowed for local module access.
 * @returns {Promise<vm.SourceTextModule>} Linked and evaluated source text module.
 */
async function loadSourceTextModule({
  resolvedPath,
  collectionPath,
  isolatedContext,
  localModuleCache,
  additionalContextRootsAbsolute
}) {
  const cacheKey = getEsmCacheKey(resolvedPath);
  if (localModuleCache.has(cacheKey)) {
    const cachedModule = localModuleCache.get(cacheKey);
    await evaluateModuleIfNeeded(cachedModule);
    return cachedModule;
  }

  const moduleSource = fs.readFileSync(resolvedPath, 'utf8');
  const moduleDir = path.dirname(resolvedPath);

  // Real ESM files are evaluated as SourceTextModule instances inside the same
  // isolated context as the parent Bruno script.
  const sourceModule = new vm.SourceTextModule(moduleSource, {
    context: isolatedContext,
    identifier: resolvedPath,
    initializeImportMeta(meta) {
      meta.url = pathToFileURL(resolvedPath).href;
    },
    importModuleDynamically: createCustomImport({
      collectionPath,
      isolatedContext,
      currentModuleDir: moduleDir,
      localModuleCache,
      additionalContextRootsAbsolute
    })
  });

  localModuleCache.set(cacheKey, sourceModule);

  // Static imports inside imported ESM modules must go through the same Bruno
  // resolver so allowed roots and collection-first package resolution are preserved.
  await sourceModule.link((nestedModuleName, referencingModule) => {
    return createCustomImport({
      collectionPath,
      isolatedContext,
      currentModuleDir: path.dirname(referencingModule.identifier),
      localModuleCache,
      additionalContextRootsAbsolute
    })(nestedModuleName, referencingModule);
  });
  await evaluateModuleIfNeeded(sourceModule);

  return sourceModule;
}

/**
 * Wraps a plain JavaScript value in a SyntheticModule so dynamic import can
 * return CJS, JSON, and builtin modules through an ESM-compatible namespace.
 * @param {Object} options - Configuration options.
 * @param {string} options.identifier - Stable module identifier used as the ESM cache key.
 * @param {*} options.exportsValue - Value to expose through synthetic exports.
 * @param {vm.Context} options.isolatedContext - VM context created with vm.createContext().
 * @param {Map<string, *>} options.localModuleCache - Shared CJS/ESM module cache.
 * @param {boolean} [options.defaultOnly=false] - Whether to expose only the default export.
 * @returns {Promise<vm.SyntheticModule>} Linked and evaluated synthetic module.
 */
async function createSyntheticModuleFromExports({
  identifier,
  exportsValue,
  isolatedContext,
  localModuleCache,
  defaultOnly = false
}) {
  const cacheKey = getEsmCacheKey(identifier);
  if (localModuleCache.has(cacheKey)) {
    const cachedModule = localModuleCache.get(cacheKey);
    await evaluateModuleIfNeeded(cachedModule);
    return cachedModule;
  }

  const exportNames = getSyntheticExportNames(exportsValue, defaultOnly);
  // SyntheticModule lets non-ESM values satisfy the vm importModuleDynamically
  // contract, which requires a vm.Module rather than a plain object.
  const syntheticModule = new vm.SyntheticModule(exportNames, function () {
    this.setExport('default', exportsValue);

    if (!defaultOnly && exportsValue && (typeof exportsValue === 'object' || typeof exportsValue === 'function')) {
      Object.keys(exportsValue).forEach((key) => {
        if (key === 'default') {
          return;
        }
        this.setExport(key, exportsValue[key]);
      });
    }
  }, {
    context: isolatedContext,
    identifier
  });

  localModuleCache.set(cacheKey, syntheticModule);

  await syntheticModule.link(() => {});
  await evaluateModuleIfNeeded(syntheticModule);

  return syntheticModule;
}

/**
 * Determines whether a resolved path should be evaluated as ESM.
 * @param {string} resolvedPath - Absolute resolved module path.
 * @returns {boolean} True for .mjs files and .js files inside type=module packages.
 */
function shouldLoadAsEsm(resolvedPath) {
  if (resolvedPath.endsWith('.mjs')) {
    return true;
  }

  if (!resolvedPath.endsWith('.js')) {
    return false;
  }

  const packageJsonPath = findNearestPackageJson(path.dirname(resolvedPath));
  if (!packageJsonPath) {
    return false;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return pkg.type === 'module';
  } catch {
    return false;
  }
}

/**
 * Finds the nearest package.json by walking up from a starting directory.
 * @param {string} startDir - Directory to begin searching from.
 * @returns {string|null} Absolute package.json path, or null when none is found.
 */
function findNearestPackageJson(startDir) {
  let currentDir = startDir;

  while (currentDir && currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Builds the export names exposed by a SyntheticModule wrapper.
 * @param {*} exportsValue - CJS, JSON, or builtin export value to wrap.
 * @param {boolean} defaultOnly - Whether to expose only the default export.
 * @returns {string[]} Export names for the synthetic namespace.
 */
function getSyntheticExportNames(exportsValue, defaultOnly) {
  const exportNames = new Set(['default']);

  if (!defaultOnly && exportsValue && (typeof exportsValue === 'object' || typeof exportsValue === 'function')) {
    Object.keys(exportsValue).forEach((key) => {
      exportNames.add(key);
    });
  }

  return Array.from(exportNames);
}

/**
 * Evaluates a VM module when it has not already been evaluated.
 * @param {vm.Module} moduleInstance - SourceTextModule or SyntheticModule instance.
 * @returns {Promise<void>} Resolves after evaluation completes.
 */
async function evaluateModuleIfNeeded(moduleInstance) {
  if (moduleInstance.status !== 'evaluated') {
    await moduleInstance.evaluate();
  }
}

/**
 * Creates the ESM cache key for a module identifier.
 * @param {string} identifier - Module path or synthetic identifier.
 * @returns {string} Cache key namespaced for ESM entries.
 */
function getEsmCacheKey(identifier) {
  return ESM_CACHE_PREFIX + identifier;
}

module.exports = {
  createCustomImport
};
