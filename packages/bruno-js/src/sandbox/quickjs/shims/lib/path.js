const path = require('path');
const { marshallToVm } = require('../../utils');

const fns = ['resolve'];

const addPathShimToContext = async (vm) => {
  fns.forEach((fn) => {
    let fnHandle = vm.newFunction(fn, function (...args) {
      const nativeArgs = args.map(vm.dump);
      return marshallToVm(path[fn](...nativeArgs), vm);
    });
    vm.setProp(vm.global, `__bruno__path__${fn}`, fnHandle);
    fnHandle.dispose();
  });

  vm.evalCode(
    `
        globalThis.path = {};
        ${fns?.map((fn, idx) => `globalThis.path.${fn} = __bruno__path__${fn}`).join('\n')}
        globalThis.requireObject = {
            ...(globalThis.requireObject || {}),
            path: globalThis.path,
        }
    `
  );
};

module.exports = addPathShimToContext;
