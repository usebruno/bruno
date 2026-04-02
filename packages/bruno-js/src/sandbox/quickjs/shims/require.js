/**
 * Returns JavaScript code that sets up the require() function in the QuickJS VM.
 * This module loader looks up modules from globalThis.requireObject and optionally
 * supports loading local modules if the necessary context (bru.cwd, __brunoLoadLocalModule) is available.
 *
 * @param {Object} options
 * @param {boolean} options.enableLocalModules - Whether to enable local module loading (requires bru context)
 * @returns {string} JavaScript code to eval in the VM
 */
function getRequireCode({ enableLocalModules = true } = {}) {
  if (!enableLocalModules) {
    // Simple version for unit tests - only looks up from requireObject
    return `
      globalThis.require = (mod) => {
        let lib = globalThis.requireObject[mod];
        if (lib) {
          return lib;
        } else {
          throw new Error("Cannot find module " + mod);
        }
      }
    `;
  }

  // Full version with local module support
  return `
    globalThis.require = (mod) => {
      let lib = globalThis.requireObject[mod];
      let isModuleAPath = (module) => (module?.startsWith('.') || module?.startsWith(bru.cwd()))
      if (lib) {
        return lib;
      }
      else if (isModuleAPath(mod)) {
        // fetch local module
        let localModuleCode = globalThis.__brunoLoadLocalModule(mod);

        // compile local module as iife
        (function (){
          const initModuleExportsCode = "const module = { exports: {} };"
          const copyModuleExportsCode = "\\n;globalThis.requireObject[mod] = module.exports;";
          const patchedRequire = ${`
            "\\n;" +
            "let require = (subModule) => isModuleAPath(subModule) ? globalThis.require(path.resolve(bru.cwd(), mod, '..', subModule)) : globalThis.require(subModule)" +
            "\\n;"
          `}
          eval(initModuleExportsCode + patchedRequire + localModuleCode + copyModuleExportsCode);
        })();

        // resolve module
        return globalThis.requireObject[mod];
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
function addRequireShimToContext(vm, options = {}) {
  vm.evalCode(getRequireCode(options));
}

module.exports = {
  getRequireCode,
  addRequireShimToContext
};
