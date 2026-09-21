const createLocalModuleLoaderHandle = require('./local-module');
const { evalAndCall } = require('../utils');

/**
 * Returns a factory function (as VM source) that installs globalThis.require.
 *
 * The factory takes the host loader as an argument, so require closes over it and the
 * loader is never placed on the VM global where user scripts could call it directly.
 *
 * @returns {string} JavaScript source of the factory, to eval then call with the loader
 */
function getRequireFactoryCode() {
  return `
    (loadLocalModule) => {
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
    }
  `;
}

/**
 * Installs require() into a QuickJS VM context.
 * @param {Object} vm - QuickJS VM context
 * @param {string} [collectionPath] - Root local modules must stay within
 */
function addRequireShimToContext(vm, collectionPath) {
  createLocalModuleLoaderHandle(vm, collectionPath).consume((loadLocalModule) => {
    evalAndCall(vm, { code: getRequireFactoryCode(), args: [loadLocalModule] });
  });
}

module.exports = {
  getRequireFactoryCode,
  addRequireShimToContext
};
