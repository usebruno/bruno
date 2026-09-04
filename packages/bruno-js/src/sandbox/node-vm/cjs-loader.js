const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const nodeModule = require('node:module');
const { AsyncLocalStorage } = require('node:async_hooks');

const { isBuiltinModule, isPathWithinAllowedRoots } = require('./utils');
const { safeGlobals } = require('./constants');
const { mixinTypedArrays } = require('../mixins/typed-arrays');

/**
 * Shared context for npm modules.
 *
 * Every script execution runs in a fresh vm context, so evaluating npm modules
 * inside the script's own context meant a collection-level script doing
 * `require('@faker-js/faker')` re-evaluated the whole package on every request
 * (~20 MB of heap and ~8 MB of ArrayBuffers per script run, sitting in contexts
 * V8 only reclaims under heap pressure — a 2,000-request `bru run` reached
 * 9.5 GB RSS, see usebruno/bruno#9074).
 *
 * npm modules are therefore evaluated once per process, in a single dedicated
 * context, and their exports are shared by every script — the way Node's own
 * `require` cache behaves. The Bruno objects a module may reference as globals
 * (`bru`, `req`, `res`, `test`, ...) are exposed on that context as accessors
 * that resolve to the *currently executing* script's context, so a module
 * evaluated during request 1 still sees request 42's `bru` when called from
 * request 42. Collection-local modules (`./scripts/x.js`) are unaffected: they
 * keep being evaluated per script context, cached in `localModuleCache`.
 *
 * "Currently executing" is tracked with AsyncLocalStorage rather than a global,
 * because a script's `runInContext` is awaited: executions that interleave (the
 * app can run several requests at once) must each keep resolving to their own
 * `bru`/`req`/`res`, whatever order they complete in. Nested executions
 * (`bru.runRequest`) nest naturally.
 */
const activeScriptContext = new AsyncLocalStorage();
// Set while an npm module body runs; records Bruno globals read at load time.
const npmModuleEval = new AsyncLocalStorage();
const sharedNpmModuleCache = new Map();
// npm paths that read bru/req/res/... during evaluation — re-run per script.
const contextBoundModulePaths = new Set();
let sharedNpmSandbox = null;
let sharedNpmContext = null;

// Keys that scripts get from Bruno rather than from the host: always exposed as
// dynamic accessors on the shared context (extended on the fly by runWithScriptContext).
const BRUNO_CONTEXT_KEYS = [
  'bru',
  'req',
  'res',
  'test',
  'expect',
  'assert',
  '__brunoTestResults',
  '__bruSetScope',
  'jwt',
  'console',
  'scriptingConfig'
];

const facades = new Map();

/**
 * Late-bound stand-in for one Bruno global (`bru`, `req`, ...) inside the shared
 * npm context. Every trap resolves the *current* script context's value, so a
 * module that captured `bru` at load time (`const captured = bru` during
 * execution A) still talks to execution B's `bru` when called from B. The
 * target is a plain object for object-valued globals (so `typeof bru` stays
 * 'object') and an arrow function for callable ones (so `test(...)` works);
 * neither has a non-configurable own property that would constrain the traps.
 * One facade per (key, callability), picked from the value the current
 * execution provides, so a key that is an object in one execution and a
 * function in another is served correctly in both.
 * @param {string} key - The Bruno global's name
 * @param {boolean} callable - Whether the current value is a function
 */
function facadeFor(key, callable) {
  const cacheKey = `${key}:${callable ? 'fn' : 'obj'}`;
  if (facades.has(cacheKey)) {
    return facades.get(cacheKey);
  }
  const current = () => activeScriptContext.getStore()?.[key];
  const isMissing = (value) => value === undefined || value === null;
  const target = callable ? () => {} : {};
  // Methods are handed out as late-bound wrappers too, so `const { getVar } = bru`
  // at module scope keeps calling the current script's getVar. Cached per method
  // name so `bru.setVar === bru.setVar` holds within the facade.
  const methods = new Map();
  const lateBoundMethod = (prop) => {
    if (!methods.has(prop)) {
      methods.set(prop, (...args) => {
        const value = current();
        const member = isMissing(value) ? undefined : value[prop];
        if (typeof member !== 'function') {
          throw new TypeError(`${key}.${String(prop)} is not available outside of a script execution`);
        }
        return Reflect.apply(member, value, args);
      });
    }
    return methods.get(prop);
  };
  const facade = new Proxy(target, {
    get: (_, prop) => {
      const value = current();
      if (isMissing(value)) {
        return undefined;
      }
      const member = value[prop];
      return typeof member === 'function' ? lateBoundMethod(prop) : member;
    },
    set: (_, prop, newValue) => {
      const value = current();
      if (isMissing(value)) {
        return false;
      }
      value[prop] = newValue;
      return true;
    },
    has: (_, prop) => {
      const value = current();
      return !isMissing(value) && prop in Object(value);
    },
    ownKeys: () => {
      const value = current();
      return isMissing(value) ? [] : Reflect.ownKeys(Object(value));
    },
    getOwnPropertyDescriptor: (_, prop) => {
      const value = current();
      const descriptor = isMissing(value) ? undefined : Object.getOwnPropertyDescriptor(Object(value), prop);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
    getPrototypeOf: () => {
      const value = current();
      return isMissing(value) ? null : Object.getPrototypeOf(Object(value));
    },
    apply: (_, thisArg, args) => {
      const value = current();
      if (typeof value !== 'function') {
        throw new TypeError(`${key} is not available outside of a script execution`);
      }
      return Reflect.apply(value, thisArg, args);
    }
  });
  facades.set(cacheKey, facade);
  return facade;
}

function defineDynamicGlobal(key) {
  if (Object.prototype.hasOwnProperty.call(sharedNpmSandbox, key)) {
    return;
  }
  Object.defineProperty(sharedNpmSandbox, key, {
    enumerable: true,
    configurable: true,
    get: () => {
      // A key the current execution does not provide reads as undefined, exactly
      // as it would inside the script's own context (e.g. `res` before a response).
      const evalStore = npmModuleEval.getStore();
      if (evalStore) {
        evalStore.touched.add(key);
      }
      const value = activeScriptContext.getStore()?.[key];
      if (value === undefined || value === null) {
        return undefined;
      }
      // Primitive context values cannot be represented by an object facade.
      // Return them directly, preserving the pre-shared-context behavior.
      if (typeof value !== 'object' && typeof value !== 'function') {
        return value;
      }
      return facadeFor(key, typeof value === 'function');
    }
  });
}

function getSharedNpmContext() {
  if (!sharedNpmContext) {
    sharedNpmSandbox = Object.fromEntries(
      safeGlobals
        .filter((key) => global[key] !== undefined)
        .map((key) => [key, global[key]])
    );
    mixinTypedArrays(sharedNpmSandbox);
    sharedNpmContext = vm.createContext(sharedNpmSandbox);
    sharedNpmSandbox.global = sharedNpmSandbox;
    sharedNpmSandbox.globalThis = sharedNpmSandbox;
    BRUNO_CONTEXT_KEYS.forEach(defineDynamicGlobal);
  }
  return sharedNpmContext;
}

/**
 * Runs `fn` with `scriptContext` as the currently executing script context, so
 * npm modules called from it (or from async work it starts) resolve `bru`,
 * `req`, `res`, ... to it. Safe for interleaved executions; nested executions
 * (`bru.runRequest`) see their own context.
 * @param {Object} scriptContext - The script's vm global object
 * @param {Function} fn - The execution, typically `() => script.runInContext(...)`
 * @returns {*} Whatever `fn` returns
 */
function runWithScriptContext(scriptContext, fn) {
  getSharedNpmContext();
  for (const key of Object.keys(scriptContext)) {
    if (key !== 'global' && key !== 'globalThis' && key !== 'require') {
      defineDynamicGlobal(key);
    }
  }
  return activeScriptContext.run(scriptContext, fn);
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
 * Creates a custom require function with enhanced security and local module support
 * @param {Object} options - Configuration options
 * @param {string} options.collectionPath - Path to the collection directory
 * @param {Object} options.isolatedContext - The VM isolated context created with vm.createContext()
 * @param {string} options.currentModuleDir - Current module directory for resolving relative paths
 * @param {Map} options.localModuleCache - Cache for loaded modules
 * @param {string[]} options.additionalContextRootsAbsolute - Allowed roots for local file imports
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

    // 4. Handle npm modules - shared when inert, per-script when load-time globals are read
    return loadNpmModule({
      moduleName,
      collectionPath,
      currentModuleDir,
      isolatedContext,
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
 * Executes an npm module in the shared npm context, caching it process-wide,
 * with special file handling
 * @param {Object} options - Configuration options
 * @returns {*} The exported content of the loaded module
 * @throws {Error} When module cannot be loaded
 */
function executeModuleInVmContext({
  resolvedPath,
  moduleName,
  collectionPath,
  isolatedContext,
  localModuleCache
}) {
  const isContextBound = contextBoundModulePaths.has(resolvedPath);

  if (isContextBound) {
    if (localModuleCache?.has(resolvedPath)) {
      return localModuleCache.get(resolvedPath).exports;
    }
    return evaluateNpmModule({
      resolvedPath,
      moduleName,
      collectionPath,
      isolatedContext,
      localModuleCache,
      useSharedContext: false
    });
  }

  if (sharedNpmModuleCache.has(resolvedPath)) {
    return sharedNpmModuleCache.get(resolvedPath).exports;
  }

  return evaluateNpmModule({
    resolvedPath,
    moduleName,
    collectionPath,
    isolatedContext,
    localModuleCache,
    useSharedContext: true
  });
}

function evaluateNpmModule({
  resolvedPath,
  moduleName,
  collectionPath,
  isolatedContext,
  localModuleCache,
  useSharedContext
}) {
  // Native modules (.node files) - fall back to host require
  // Note: This bypasses VM isolation for native addons.
  // This is intentional - [`developer` mode] node-vm isolation need not be strict for native modules.
  if (resolvedPath.endsWith('.node')) {
    const result = require(resolvedPath);
    const moduleObj = { exports: result };
    if (useSharedContext) {
      sharedNpmModuleCache.set(resolvedPath, moduleObj);
    } else {
      localModuleCache.set(resolvedPath, moduleObj);
    }
    return result;
  }

  // JSON files - parse directly
  if (resolvedPath.endsWith('.json')) {
    const jsonContent = fs.readFileSync(resolvedPath, 'utf8');
    const result = JSON.parse(jsonContent);
    const moduleObj = { exports: result };
    if (useSharedContext) {
      sharedNpmModuleCache.set(resolvedPath, moduleObj);
    } else {
      localModuleCache.set(resolvedPath, moduleObj);
    }
    return result;
  }

  const moduleSource = fs.readFileSync(resolvedPath, 'utf8');
  const moduleDir = path.dirname(resolvedPath);
  const moduleObj = { exports: {} };
  const moduleCache = useSharedContext ? sharedNpmModuleCache : localModuleCache;

  moduleCache.set(resolvedPath, moduleObj);

  const moduleRequire = createNpmModuleRequire({
    collectionPath,
    currentModuleDir: moduleDir,
    isolatedContext,
    localModuleCache
  });

  const vmContext = useSharedContext ? getSharedNpmContext() : isolatedContext;
  const evalStore = { resolvedPath, touched: new Set() };

  try {
    const wrappedCode = `(function(module, exports, require, __filename, __dirname) {\n${moduleSource}\n})`;
    const compiledScript = new vm.Script(wrappedCode, { filename: resolvedPath });
    const moduleFunction = compiledScript.runInContext(vmContext);
    npmModuleEval.run(evalStore, () => {
      moduleFunction(moduleObj, moduleObj.exports, moduleRequire, resolvedPath, moduleDir);
    });

    if (useSharedContext && evalStore.touched.size > 0) {
      contextBoundModulePaths.add(resolvedPath);
      sharedNpmModuleCache.delete(resolvedPath);
      localModuleCache.set(resolvedPath, moduleObj);
    }
  } catch (error) {
    moduleCache.delete(resolvedPath);
    const stack = error.stack || '';
    throw new Error(`Error loading module ${moduleName}: ${error.message}\nStack: ${stack}`);
  }

  return moduleObj.exports;
}

/**
 * Loads an npm module into the vm context.
 *
 * Resolution order matches standard Node.js walk-up:
 *   1. currentModuleDir/node_modules → walk up parent dirs
 *   2. collectionPath/node_modules
 *   3. Bruno's bundled node_modules (final fallback for chai/ajv/axios/etc.)
 *
 * @param {Object} options - Configuration options
 * @returns {*} The exported content of the loaded module
 * @throws {Error} When module cannot be resolved or loaded
 */
function loadNpmModule({
  moduleName,
  collectionPath,
  currentModuleDir,
  isolatedContext,
  localModuleCache
}) {
  let resolvedPath;

  if (currentModuleDir) {
    try {
      const callerRequire = nodeModule.createRequire(path.join(currentModuleDir, 'package.json'));
      resolvedPath = callerRequire.resolve(moduleName);
    } catch {
      // Not found via walk-up, continue to fallbacks
    }
  }

  if (!resolvedPath && collectionPath) {
    try {
      const collectionRequire = nodeModule.createRequire(path.join(collectionPath, 'package.json'));
      resolvedPath = collectionRequire.resolve(moduleName);
    } catch {
      // Module not found in collection, continue to fallback
    }
  }

  // Fall back to Bruno's bundled node_modules
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
    localModuleCache
  });
}

/**
 * Creates the require function handed to a loaded npm module. Resolution is
 * plain Node.js walk-up from the module's own directory — internal relative
 * requires, sibling packages, and npm-linked / file: dependencies all resolve
 * the way native `require` would from that location.
 *
 * @param {Object} options - Configuration options
 * @returns {Function} Custom require function for npm module dependencies
 */
function createNpmModuleRequire({
  collectionPath,
  currentModuleDir,
  isolatedContext,
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
        collectionPath,
        isolatedContext,
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
      collectionPath,
      isolatedContext,
      localModuleCache
    });
  };
}

module.exports = {
  createCustomRequire,
  runWithScriptContext,
  __resetNpmModuleStateForTests: () => {
    sharedNpmModuleCache.clear();
    contextBoundModulePaths.clear();
    facades.clear();
    sharedNpmSandbox = null;
    sharedNpmContext = null;
  }
};
