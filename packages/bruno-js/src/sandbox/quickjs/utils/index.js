/**
 * Creates a QuickJS context with centralized lifecycle management:
 * - vm.evalCode() auto-disposes result handles (for shim setup code)
 * - vm.evalCodeRetained() returns the raw result (for user script execution)
 * - all newObject/newFunction/newArray handles are tracked and disposed on teardown
 */
const createManagedQuickJsContext = (module) => {
  const vm = module.newContext();
  const disposeTracked = trackQuickJsContext(vm);
  const evalCodeRetained = vm.evalCode.bind(vm);
  const waitForPendingDeferreds = trackPendingDeferreds(vm);

  vm.evalCode = (code, filename = 'eval.js') => {
    const result = evalCodeRetained(code, filename);
    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw error;
    }
    result.value.dispose();
  };

  vm.evalCodeRetained = evalCodeRetained;

  return {
    vm,
    waitForPendingDeferreds,
    dispose: () => disposeQuickJsContext(vm, disposeTracked)
  };
};

/**
 * Track every deferred created by the async shims (sendRequest, axios, cookie
 * jar, sleep, ...) so teardown can wait for them to settle. A user script that
 * fires-and-forgets async work (e.g. an un-awaited setTimeout) resolves the
 * wrapping closure immediately; without this, the VM is disposed before the
 * deferred's host callback runs, and touching the freed context throws
 * `QuickJSUseAfterFree`. Each `.settled` resolves once the deferred is
 * resolved/rejected, so awaiting them keeps the context alive long enough.
 *
 * The hook is installed now (at context creation) so it captures promises as
 * the script runs. Returns a function that drains the captured deferreds at
 * teardown; new deferreds can be created while we wait (a chained timer), so it
 * drains in place until none remain.
 */

const trackPendingDeferreds = (vm) => {
  const pendingDeferreds = [];
  const originalNewPromise = vm.newPromise.bind(vm);
  vm.newPromise = (...args) => {
    const deferred = originalNewPromise(...args);
    pendingDeferreds.push(deferred.settled.catch(() => { }));
    return deferred;
  };

  return async () => {
    while (pendingDeferreds.length) {
      const batch = pendingDeferreds.splice(0);
      await Promise.all(batch);
    }
  };
};

/**
 * Tracks handles created via newObject/newFunction/newArray so they can all be
 * disposed before the context. quickjs-emscripten requires every heap handle to
 * be disposed individually; shims attach then drop their ref via .dispose().
 */
const trackQuickJsContext = (vm) => {
  const handles = [];

  const track = (handle) => {
    handles.push(handle);
    return handle;
  };

  // Replace an allocator with a wrapper that records every handle it returns,
  // so teardown can dispose them all. Behaviour is otherwise identical.
  const trackAllocations = (method) => {
    const original = vm[method]?.bind(vm);
    if (!original) {
      return;
    }

    vm[method] = (...args) => track(original(...args));
  };

  ['newObject', 'newFunction', 'newArray'].forEach(trackAllocations);

  // Dispose newest-first: later handles may reference earlier ones.
  return () => {
    for (const handle of handles.reverse()) {
      if (handle?.alive) {
        handle.dispose();
      }
    }
  };
};

/**
 * Clears shim globals, drains pending QuickJS jobs, and disposes the context.
 * Pass disposeTracked from trackQuickJsContext() to free shim handles first.
 */
const disposeQuickJsContext = (vm, disposeTracked) => {
  if (!vm?.alive) {
    return;
  }

  if (typeof disposeTracked === 'function') {
    disposeTracked();
  }

  // Drain the runtime's pending job queue (resolved/rejected promise callbacks)
  // before disposing. Executing a job can schedule more jobs (chained `.then()`s),
  // so we keep going until `hasPendingJob()` reports the queue is empty or a job
  // throws.
  while (vm.runtime?.hasPendingJob?.()) {
    const result = vm.runtime.executePendingJobs();
    // On error, dispose the error handle and stop draining.
    if (result.error) {
      result.error.dispose();
      break;
    }
  }
  vm.dispose();
};

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
  invokeFunction,
  createManagedQuickJsContext,
  disposeQuickJsContext,
  trackQuickJsContext
};
