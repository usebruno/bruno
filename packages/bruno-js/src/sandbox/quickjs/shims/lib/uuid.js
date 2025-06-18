const uuid = require('uuid');
const { marshallToVm } = require('../../utils');

const fns = ['version', 'parse', 'stringify', 'v1', 'v1ToV6', 'v3', 'v4', 'v5', 'v6', 'v6ToV1', 'v7', 'validate'];

const addUuidShimToContext = async (vm) => {
  fns.forEach((fn) => {
    let fnHandle = vm.newFunction(fn, function (...args) {
      const nativeArgs = args.map(vm.dump);
      return marshallToVm(uuid[fn](...nativeArgs), vm);
    });
    vm.setProp(vm.global, `__bruno__uuid__${fn}`, fnHandle);
    fnHandle.dispose();
  });

  vm.evalCode(
    `
        globalThis.uuid = {};
        ${['version', 'parse', 'stringify', 'v1', 'v1ToV6', 'v3', 'v4', 'v5', 'v6', 'v6ToV1', 'v7', 'validate']
          ?.map((fn, idx) => `globalThis.uuid.${fn} = __bruno__uuid__${fn}`)
          .join('\n')}
        globalThis.requireObject = {
            ...globalThis.requireObject,
            uuid: globalThis.uuid,
        }
    `
  );
};

module.exports = addUuidShimToContext;
