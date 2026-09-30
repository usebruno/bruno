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
 * @example
 * In shims/bru.js, wiring up bru.cookies takes a single call:
 *
 * const { evalCode: cookiesEvalCode } = createPropertyListBridge(vm, bru.cookies, bruCookiesObject, {
 *   globalPath: 'globalThis.bru.cookies',
 *   syncReadMethods: ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'],
 *   syncReadObjectMethods: ['one', 'all', 'idx', 'toJSON'],
 *   asyncWriteMethods: ['add', 'upsert', 'remove', 'clear', 'delete'],
 *   withIterators: true
 * });
 *
 * Without this factory, each method would require manual boilerplate like the
 * hand-written jar() bridge in bru.js (~100 lines), where every method needs:
 *
 *   const _fn = vm.newFunction('_method', (...vmArgs) => {
 *     const promise = vm.newPromise();
 *     nativeObj.method(vm.dump(vmArgs[0]), (err, result) => {
 *       if (err) {
 *         promise.reject(marshallToVm(cleanJson(err), vm));
 *       } else {
 *         promise.resolve(marshallToVm(cleanCircularJson(result), vm));
 *       }
 *     });
 *     promise.settled.then(vm.runtime.executePendingJobs);
 *     return promise.handle;
 *   });
 *   _fn.consume((handle) => vm.setProp(obj, '_method', handle));
 *
 * …repeated for every method, plus separate evalCode for async wrappers.
 *
 * To wire up a new PropertyList-backed object, add one createPropertyListBridge
 * call instead of duplicating all that boilerplate.
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
    syncWriteMethods = [],
    asyncWriteMethods = [],
    withIterators = false
  } = options;

  // Sync read methods — return primitive values
  for (const methodName of syncReadMethods) {
    const fn = vm.newFunction(methodName, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      return marshallToVm(nativeList[methodName](...args), vm);
    });
    fn.consume((handle) => vm.setProp(targetObj, methodName, handle));
  }

  // Sync read object methods — need cleanCircularJson
  for (const methodName of syncReadObjectMethods) {
    const fn = vm.newFunction(methodName, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      return marshallToVm(cleanCircularJson(nativeList[methodName](...args)), vm);
    });
    fn.consume((handle) => vm.setProp(targetObj, methodName, handle));
  }

  // Sync write methods — void return, just call and discard
  for (const methodName of syncWriteMethods) {
    const fn = vm.newFunction(methodName, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      nativeList[methodName](...args);
      return vm.undefined;
    });
    fn.consume((handle) => vm.setProp(targetObj, methodName, handle));
  }

  // Async write methods — two-phase setup:
  // Phase 1 (native): Register `_prefixed` bridge functions (e.g. `_add`, `_remove`) via
  // createAsyncBridge. These are QuickJS promise-based wrappers that call the native method's
  // callback API and resolve with `undefined` (write-only).
  // Phase 2 (evalCode): Generates JS code eval'd in the VM that:
  //   1. Defines a `callWithCallback` helper supporting both `await method(args)` and
  //      `method(args, callback)` calling styles.
  //   2. Captures `_prefixed` direct references, then overwrites the public method name with
  //      a wrapper that auto-detects whether the last argument is a callback.
  for (const methodName of asyncWriteMethods) {
    createAsyncBridge(vm, targetObj, `_${methodName}`, (...a) => nativeList[methodName](...a));
  }

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

  // Iterators — these can't be bridged as syncReadObjectMethods because they take a callback
  // function as an argument, and functions can't cross the native↔VM boundary (vm.dump() can't
  // serialize them). Instead, we pull the data into the VM via `all()`, then run the array
  // operation inside the VM where the callback lives. Requires `all` in `syncReadObjectMethods`.
  if (withIterators) {
    evalCode += `const _allNative = ${globalPath}.all;
    ${globalPath}.each = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; _allNative().forEach(b); };
    ${globalPath}.filter = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _allNative().filter(b); };
    ${globalPath}.find = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _allNative().find(b); };
    ${globalPath}.map = (fn, ctx) => { const b = ctx !== undefined ? fn.bind(ctx) : fn; return _allNative().map(b); };
    ${globalPath}.reduce = (fn, ...rest) => { const ctx = rest.length > 1 ? rest[1] : undefined; const b = ctx !== undefined ? fn.bind(ctx) : fn; return rest.length > 0 ? _allNative().reduce(b, rest[0]) : _allNative().reduce(b); };\n`;
  }

  // Override `remove` when it's a syncWriteMethod so function predicates work in-VM.
  // The native bridge can't serialize function handles (vm.dump fails on functions).
  // Instead: pull items via all(), run the predicate in-VM, call native remove(key) per match.
  if (withIterators && syncWriteMethods.includes('remove')) {
    evalCode += `const _removeNative = ${globalPath}.remove;
    ${globalPath}.remove = (predicate) => {
      if (typeof predicate === 'function') {
        _allNative().filter(predicate).forEach(item => _removeNative(item.key));
      } else {
        _removeNative(predicate);
      }
    };\n`;
  }

  return { evalCode };
};

module.exports = {
  createPropertyListBridge,
  createAsyncBridge
};
