const { marshallToVm } = require('../utils');

// Marshal a QuickJS query argument to a host-compatible value.
// Function handles are wrapped as native callbacks; other values are dumped as-is.
const toHostQueryArg = (vm, arg) => {
  if (vm.typeof(arg) === 'function') {
    return (item) => {
      const itemHandle = marshallToVm(item, vm);
      const result = vm.callFunction(arg, vm.undefined, itemHandle);
      itemHandle.dispose();

      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw error;
      }

      const value = vm.dump(result.value);
      result.value.dispose();
      return value;
    };
  }

  return vm.dump(arg);
};

const addBrunoOnMessageShimToContext = (vm, stream) => {
  // stream('a.b.c') queries into the message, same ergonomics as res(...).
  let streamFn = vm.newFunction('stream', function (exprStr, ...queryArgs) {
    const nativeArgs = queryArgs.map((arg) => toHostQueryArg(vm, arg));
    return marshallToVm(stream(vm.dump(exprStr), ...nativeArgs), vm);
  });

  const message = marshallToVm(stream?.message, vm);
  vm.setProp(streamFn, 'message', message);
  message.dispose();

  let getMessage = vm.newFunction('getMessage', function () {
    return marshallToVm(stream.getMessage(), vm);
  });
  vm.setProp(streamFn, 'getMessage', getMessage);
  getMessage.dispose();

  vm.setProp(vm.global, 'stream', streamFn);
  streamFn.dispose();
};

module.exports = addBrunoOnMessageShimToContext;
