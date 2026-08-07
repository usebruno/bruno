/**
 * Returns JavaScript code that sets up the require() function in the QuickJS VM.
 * This module loader looks up modules from globalThis.requireObject and optionally
 * supports loading local modules if the necessary context (bru.cwd, __brunoLoadLocalModule) is available.
 *
 * @param {Object} options
 * @param {boolean} options.enableLocalModules - Whether to enable local module loading (requires bru context)
 * @returns {string} JavaScript code to eval in the VM
 */
function getRequireCode() {
  return `
    globalThis.__brunoResolvedModulePaths = {};

    globalThis.require = (mod) => {
      let lib = globalThis.requireObject[mod];
      let isModuleAPath = (module) => (module?.startsWith('.') || (typeof bru !== 'undefined' && module?.startsWith(bru.cwd())))
      let isModuleLoaded = (key) => Object.prototype.hasOwnProperty.call(globalThis.requireObject, key);
      if (lib) {
        return lib;
      }
      else if (isModuleAPath(mod)) {
        // a specifier always resolves against the same base (the collection root
        // for relative ones, since nested requires are made absolute below), so
        // remembering its resolved path lets a repeated require skip the host
        // round-trip: another read and TypeScript transpile of the same file
        const knownPath = globalThis.__brunoResolvedModulePaths[mod];
        if (knownPath && isModuleLoaded(knownPath)) {
          return globalThis.requireObject[knownPath];
        }

        // fetch local module (source code + canonical resolved path)
        const localModule = globalThis.__brunoLoadLocalModule(mod);
        const resolvedPath = localModule.resolvedPath;
        globalThis.__brunoResolvedModulePaths[mod] = resolvedPath;

        // the same file can be requested through different specifiers
        // ('./helper', './helper.ts', a directory resolving to its index) —
        // cache under the resolved path so it is only evaluated once
        if (isModuleLoaded(resolvedPath)) {
          return globalThis.requireObject[resolvedPath];
        }

        // compile local module as iife
        try {
          (function (){
            // the exports object is published before the body runs, so a module
            // required again while it is still loading (a cycle) gets the partial
            // exports instead of re-entering the loader forever
            const initModuleExportsCode = "const module = { exports: {} };"
              + "\\n;globalThis.requireObject[resolvedPath] = module.exports;";
            const copyModuleExportsCode = "\\n;globalThis.requireObject[resolvedPath] = module.exports;";
            // nested imports resolve relative to the resolved file — not the requested
            // specifier, which may name a directory ('./lib' -> lib/index.ts)
            const patchedRequire = "\\n;"
              + "let require = (subModule) => isModuleAPath(subModule) ? globalThis.require(path.resolve(resolvedPath, '..', subModule)) : globalThis.require(subModule)"
              + "\\n;";
            // the module body runs inside a function wrapper (like Node's CJS wrapper)
            // so its own top-level 'var module' / 'var exports' declarations (UMD-style
            // output) don't clash with the bindings above
            const moduleWrapperStart = "\\n;(function (module, exports) {\\n";
            const moduleWrapperEnd = "\\n})(module, module.exports);";
            eval(initModuleExportsCode + patchedRequire + moduleWrapperStart + localModule.code + moduleWrapperEnd + copyModuleExportsCode);
          })();
        } catch (error) {
          // a module whose body threw must not stay cached as partial exports
          delete globalThis.requireObject[resolvedPath];
          throw error;
        }

        // resolve module
        return globalThis.requireObject[resolvedPath];
      }
      else {
        throw new Error("Cannot find module " + mod);
      }
    }
  `;
}

/**
 * Adds the require() function to a QuickJS VM context
 * @param {Object} vm - QuickJS VM context
 * @param {Object} options - Options passed to getRequireCode
 */
function addRequireShimToContext(vm) {
  vm.evalCode(getRequireCode());
}

module.exports = {
  getRequireCode,
  addRequireShimToContext
};
