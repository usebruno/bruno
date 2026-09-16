/**
 * Returns JavaScript code that sets up the require() function in the QuickJS VM.
 * Modules are looked up in globalThis.requireObject; paths are loaded through the host
 * loader that addLocalModuleLoaderShimToContext places at __brunoLoadLocalModule. The
 * code captures that loader and deletes the global, so user scripts cannot reach it.
 *
 * @returns {string} JavaScript code to eval in the VM
 */
function getRequireCode() {
  return `
    (() => {
      const loadLocalModule = globalThis.__brunoLoadLocalModule;
      delete globalThis.__brunoLoadLocalModule;

      globalThis.require = (mod) => {
        let lib = globalThis.requireObject[mod];
        let isModuleAPath = (module) => (module?.startsWith('.') || (typeof bru !== 'undefined' && module?.startsWith(bru.cwd())))
        if (lib) {
          return lib;
        }
        else if (isModuleAPath(mod)) {
          // fetch local module
          let localModuleCode = loadLocalModule(mod);

          // compile local module. Function compiles it in global scope, so it cannot
          // reach this closure or loadLocalModule.
          const module = { exports: {} };
          let require = (subModule) => isModuleAPath(subModule)
            ? globalThis.require(path.resolve(bru.cwd(), mod, '..', subModule))
            : globalThis.require(subModule);
          new Function('module', 'exports', 'require', localModuleCode)(module, module.exports, require);
          globalThis.requireObject[mod] = module.exports;

          // resolve module
          return globalThis.requireObject[mod];
        }
        else {
          throw new Error("Cannot find module " + mod);
        }
      }
    })()
  `;
}

/**
 * Adds the require() function to a QuickJS VM context. Call it after
 * addLocalModuleLoaderShimToContext when local modules are needed.
 * @param {Object} vm - QuickJS VM context
 */
function addRequireShimToContext(vm) {
  vm.evalCode(getRequireCode());
}

module.exports = {
  getRequireCode,
  addRequireShimToContext
};
