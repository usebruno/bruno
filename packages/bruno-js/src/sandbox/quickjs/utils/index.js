const marshallToVm = (value, vm) => {
  if (value === undefined) {
    return vm.undefined;
  }
  if (value === null) {
    return vm.null;
  }
  if (typeof value === 'string') {
    return vm.newString(value);
  } else if (typeof value === 'number') {
    return vm.newNumber(value);
  } else if (typeof value === 'boolean') {
    return value ? vm.true : vm.false;
  } else if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const arr = vm.newArray();
      for (let i = 0; i < value.length; i++) {
        vm.setProp(arr, i, marshallToVm(value[i], vm));
      }
      return arr;
    } else {
      const obj = vm.newObject();
      for (const key in value) {
        vm.setProp(obj, key, marshallToVm(value[key], vm));
      }
      return obj;
    }
  } else if (typeof value === 'function') {
    return vm.newString('[Function (anonymous)]');
  }
};

/**
 * Invokes a QuickJS function handle.
 * - Returns a Promise
 *
 * @param {Object} vm - QuickJS VM instance
 * @param {QuickJSHandle} quickFn - A QuickJS function handle
 * @param {Array} args - Arguments to pass to the function
 * @returns {Promise<any>} - The result as a Promise
 */
async function invokeFunction(vm, quickFn, args = []) {
  if (vm.typeof(quickFn) !== 'function') {
    throw new TypeError('Target is not a QuickJS function');
  }

  const result = vm.callFunction(quickFn, vm.global, ...args);

  if (result.error) {
    const error = vm.dump(result.error);
    result.error.dispose();
    throw error;
  }

  // Check if the result is a QuickJS Promise handle (async functions)
  if (vm.typeof(result.value) === 'object' && result.value.constructor && vm.typeof(result.value.constructor) === 'function') {
    try {
      const promiseHandle = vm.unwrapResult(result);
      const resolvedResult = await vm.resolvePromise(promiseHandle);
      promiseHandle.dispose();
      const resolvedHandle = vm.unwrapResult(resolvedResult);
      const value = vm.dump(resolvedHandle);
      resolvedHandle.dispose();
      return Promise.resolve(value);
    } catch (promiseError) {
      // If it's not a valid Promise, throw an error
      result.value.dispose();
      throw new Error(`Invalid Promise handle: ${promiseError.message}`);
    }
  }

  const value = vm.dump(result.value);
  result.value.dispose();

  return (value && typeof value.then === 'function')
    ? value
    : Promise.resolve(value);
}

module.exports = {
  marshallToVm,
  invokeFunction
};
