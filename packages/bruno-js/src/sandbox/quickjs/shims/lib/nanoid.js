const { nanoid } = require('nanoid');
const { marshallToVm } = require('../../utils');

const addNanoidShimToContext = async (vm) => {
  let _nanoid = vm.newFunction('nanoid', function () {
    let v = nanoid();
    return marshallToVm(v, vm);
  });
  vm.setProp(vm.global, '__bruno__nanoid', _nanoid);
  _nanoid.dispose();

  vm.evalCode(
    `
      globalThis.nanoid = {};
      globalThis.nanoid.nanoid = globalThis.__bruno__nanoid;
      globalThis.requireObject = {
          ...globalThis.requireObject,
          'nanoid': globalThis.nanoid
      }
    `
  );
};

module.exports = addNanoidShimToContext;
