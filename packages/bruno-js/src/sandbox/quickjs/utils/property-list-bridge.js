const { cleanJson, cleanCircularJson } = require('../../../utils');
const { marshallToVm } = require('../utils');

/**
 * Creates an async bridge that resolves with `undefined` (write-only).
 * Do NOT reuse this for read methods that need to return values —
 * those require resolving with the callback's result argument instead.
 */
const createAsyncBridge = (vm, targetObj, propName, nativeMethod) => {
  const fn = vm.newFunction(propName, (...vmArgs) => {
    const promise = vm.newPromise();
    const args = vmArgs.map((a) => vm.dump(a));
    nativeMethod(...args, (err) => {
      if (err) {
        promise.reject(marshallToVm(cleanJson(err), vm));
      } else {
        promise.resolve(vm.undefined);
      }
    });
    promise.settled.then(vm.runtime.executePendingJobs);
    return promise.handle;
  });
  fn.consume((handle) => vm.setProp(targetObj, propName, handle));
};

/**
 * Factory that auto-wires PropertyList methods onto a QuickJS VM object.
 *
 * Generates:
 * - Sync read methods: `vm.newFunction` → `marshallToVm(nativeList.method(...args), vm)`
 * - Sync read object methods: same but wrapped with `cleanCircularJson()`
 * - Async write methods: `_prefix` bridge pattern (native callback → QuickJS promise)
 * - Returns `{ evalCode }` string containing `callWithCallback` helper + async wrappers + iterators
 *
 * @param {Object} vm - QuickJS VM instance
 * @param {Object} nativeList - Native PropertyList instance
 * @param {Object} targetObj - QuickJS object handle to attach methods to
 * @param {Object} options
 * @param {string} options.globalPath - Global path in QuickJS (e.g. 'globalThis.bru.cookies')
 * @param {string[]} [options.syncReadMethods] - Methods that return primitive values
 * @param {string[]} [options.syncReadObjectMethods] - Methods that return objects (need cleanCircularJson)
 * @param {string[]} [options.asyncWriteMethods] - Async write methods (use _prefix bridge)
 * @param {boolean} [options.withIterators] - Whether to add each/find/filter/map/reduce
 * @returns {{ evalCode: string }} - JavaScript code to eval in the VM for async wrappers and iterators
 */
const createPropertyListBridge = (vm, nativeList, targetObj, options) => {
  const {
    globalPath,
    syncReadMethods = [],
    syncReadObjectMethods = [],
    asyncWriteMethods = [],
    withIterators = false
  } = options;

  // Sync read methods — return primitive values
  for (const methodName of syncReadMethods) {
    const fn = vm.newFunction(methodName, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      return marshallToVm(nativeList[methodName](...args), vm);
    });
    vm.setProp(targetObj, methodName, fn);
    fn.dispose();
  }

  // Sync read object methods — need cleanCircularJson
  for (const methodName of syncReadObjectMethods) {
    const fn = vm.newFunction(methodName, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      return marshallToVm(cleanCircularJson(nativeList[methodName](...args)), vm);
    });
    vm.setProp(targetObj, methodName, fn);
    fn.dispose();
  }

  // Async write methods — _prefix bridge pattern
  for (const methodName of asyncWriteMethods) {
    createAsyncBridge(vm, targetObj, `_${methodName}`, (...a) => nativeList[methodName](...a));
  }

  // Build evalCode string for async wrappers and iterators
  let evalCode = '';

  if (asyncWriteMethods.length > 0) {
    evalCode += `const callWithCallback = async (promiseFn, callback) => {
      if (!callback) return await promiseFn();
      try {
        const result = await promiseFn();
        try { await callback(null, result); } catch(cbErr) { return Promise.reject(cbErr); }
      } catch(err) {
        try { await callback(err, null); } catch(cbErr) { return Promise.reject(cbErr); }
      }
    };\n`;

    // Capture _prefixed direct references before overwriting
    for (const methodName of asyncWriteMethods) {
      evalCode += `const _${methodName}Direct = ${globalPath}._${methodName};\n`;
    }

    // Generate wrapper functions: method(...args, cb?) => callWithCallback(() => _direct(...args), cb)
    for (const methodName of asyncWriteMethods) {
      evalCode += `${globalPath}.${methodName} = (...args) => {
      const cb = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
      return callWithCallback(() => _${methodName}Direct(...args), cb);
    };\n`;
    }
  }

  if (withIterators) {
    evalCode += `const _allNative = ${globalPath}.all;
    ${globalPath}.each = (fn) => { _allNative().forEach(fn); };
    ${globalPath}.filter = (fn) => _allNative().filter(fn);
    ${globalPath}.find = (fn) => _allNative().find(fn);
    ${globalPath}.map = (fn) => _allNative().map(fn);
    ${globalPath}.reduce = (fn, ...rest) => rest.length ? _allNative().reduce(fn, rest[0]) : _allNative().reduce(fn);\n`;
  }

  return { evalCode };
};

module.exports = {
  createPropertyListBridge,
  createAsyncBridge
};
