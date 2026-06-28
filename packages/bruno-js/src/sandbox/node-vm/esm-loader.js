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
 * Creates a custom import function with enhanced security and local module support
 * @param {Object} options - Configuration options
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.isolatedContext - The VM isolated context created with vm.createContext()
 * @param {string} options.currentModuleDir - Current module directory for resolving relative paths
 * @param {Map} options.localModuleCache - Cache for loaded modules
 * @param {string[]} options.additionalContextRootsAbsolute - Additional allowed root paths
 * @returns {Function} Custom import function
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

function getReferrerDir(referrer, fallbackDir) {
  if (referrer?.identifier && path.isAbsolute(referrer.identifier)) {
    return path.dirname(referrer.identifier);
  }

  return fallbackDir;
}

/**
 * Loads a local ESM or CJS module from the filesystem with security checks and caching
 * @param {Object} options - Configuration options
 * @returns {Promise<vm.Module>} VM module instance
 * @throws {Error} When module is outside collection path or cannot be loaded
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
 * Loads an npm module into the VM context
 * @param {Object} options - Configuration options
 * @returns {Promise<vm.Module>} VM module instance
 * @throws {Error} When module cannot be resolved or loaded
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
 * Executes a resolved module and returns a VM module instance
 * @param {Object} options - Configuration options
 * @returns {Promise<vm.Module>} VM module instance
 * @throws {Error} When module cannot be loaded
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

function getSyntheticExportNames(exportsValue, defaultOnly) {
  const exportNames = new Set(['default']);

  if (!defaultOnly && exportsValue && (typeof exportsValue === 'object' || typeof exportsValue === 'function')) {
    Object.keys(exportsValue).forEach((key) => {
      exportNames.add(key);
    });
  }

  return Array.from(exportNames);
}

async function evaluateModuleIfNeeded(moduleInstance) {
  if (moduleInstance.status !== 'evaluated') {
    await moduleInstance.evaluate();
  }
}

function getEsmCacheKey(identifier) {
  return ESM_CACHE_PREFIX + identifier;
}

module.exports = {
  createCustomImport
};
