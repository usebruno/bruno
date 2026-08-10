const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');
const addLocalModuleLoaderShimToContext = require('./shims/local-module');
const { getRequireCode } = require('./shims/require');
const { newQuickJSWASMModule } = require('quickjs-emscripten');

// execute `npm run sandbox:bundle-libraries` if the below file doesn't exist
const getBundledCode = require('../bundle-browser-rollup');
const addPathShimToContext = require('./shims/lib/path');
const { marshallToVm, createManagedQuickJsContext } = require('./utils');
const addCryptoUtilsShimToContext = require('./shims/lib/crypto-utils');
const { wrapScriptInClosure, SANDBOX } = require('../../utils/sandbox');

let QuickJSModule;
let quickJSModulePromise;
// Memoizes the WASM module, but stays resettable so a trap can retire the
// instance (recycleQuickJSModuleOnAbort nulls the cache to force a fresh
// build). QuickJSModule holds the resolved module as a plain value because
// executeQuickJsVm is synchronous and cannot await the promise; it may be
// null briefly at startup and after a recycle, until the load resolves.
const loader = () => {
  if (!quickJSModulePromise) {
    quickJSModulePromise = newQuickJSWASMModule().then((mod) => {
      QuickJSModule = mod;
      return mod;
    });
  }
  return quickJSModulePromise;
};
loader();

/**
 * A WASM trap inside JS_FreeRuntime (emscripten surfaces it as a thrown
 * WebAssembly.RuntimeError, e.g. the gc_obj_list assertion abort when an
 * uncatchable out-of-memory strands engine objects) leaves the instance's
 * allocator state unreliable and the runtime's memory stranded for the life
 * of the instance. Discard the module so the next run gets a fresh heap.
 * A parked context can dispose (and trap) long after its module was already
 * replaced, so only the module the failing context came from is discarded.
 * Returns whether the error was such a trap.
 */
const recycleQuickJSModuleOnAbort = (teardownError, ownerModule) => {
  if (!(teardownError instanceof WebAssembly.RuntimeError)) {
    return false;
  }
  // Retire only the failing context's own generation; a stale owner was
  // already replaced. An unknown owner fails safe toward recycling.
  if (!ownerModule || ownerModule === QuickJSModule) {
    QuickJSModule = null;
    quickJSModulePromise = null;
    loader();
  }
  return true;
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const removeQuotes = (str) => {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith('\'') && str.endsWith('\''))) {
    return str.slice(1, -1);
  }
  return str;
};

const executeQuickJsVm = ({ script: externalScript, context: externalContext, scriptType = 'template-literal' }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  if (scriptType === 'template-literal') {
    if (!isNaN(Number(externalScript))) {
      const number = Number(externalScript);

      // Check if the number is too high. Too high number might get altered, see #1000
      if (number > Number.MAX_SAFE_INTEGER) {
        return externalScript;
      }

      return toNumber(externalScript);
    }

    if (externalScript === 'true') return true;
    if (externalScript === 'false') return false;
    if (externalScript === 'null') return null;
    if (externalScript === 'undefined') return undefined;

    externalScript = removeQuotes(externalScript);
  }
  let managedQuickJsContext;
  const quickJsModule = QuickJSModule;
  try {
    managedQuickJsContext = createManagedQuickJsContext(quickJsModule);
    const vm = managedQuickJsContext.vm;
    const { bru, req, res, ...variables } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);

    Object.entries(variables)?.forEach(([key, value]) => {
      vm.setProp(vm.global, key, marshallToVm(value, vm));
    });

    const templateLiteralText = `\`${externalScript}\``;
    const jsExpressionText = `${externalScript}`;

    let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const result = vm.evalCodeRetained(scriptText);
    if (result.error) {
      let e = vm.dump(result.error);
      result.error.dispose();
      return e;
    } else {
      let v = vm.dump(result.value);
      result.value.dispose();
      return v;
    }
  } catch (error) {
    console.error('Error executing the script!', error);
  } finally {
    try {
      managedQuickJsContext?.dispose();
    } catch (teardownError) {
      recycleQuickJSModuleOnAbort(teardownError, quickJsModule);
      console.error('Error disposing QuickJS context', teardownError);
    }
  }
};

const executeQuickJsVmAsync = async ({ script: externalScript, context: externalContext, collectionPath, scriptPath }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  let managedQuickJsContext;
  let scriptError;
  let quickJsModule;
  try {
    quickJsModule = await loader();
    managedQuickJsContext = createManagedQuickJsContext(quickJsModule);
    const vm = managedQuickJsContext.vm;

    // add crypto utilities required by the crypto-js library in bundledCode
    await addCryptoUtilsShimToContext(vm);

    const bundledCode = getBundledCode?.toString() || '';

    vm.evalCode(
      `
        (${bundledCode})()
        ${getRequireCode()}
      `
    );

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    consoleFn && addConsoleShimToContext(vm, consoleFn);
    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);
    addLocalModuleLoaderShimToContext(vm, collectionPath);
    addPathShimToContext(vm);

    await addLibraryShimsToContext(vm);

    test && __brunoTestResults && addTestShimToContext(vm, __brunoTestResults);

    const script = wrapScriptInClosure(externalScript, SANDBOX.QUICKJS);

    const result = vm.evalCodeRetained(script, scriptPath);
    const promiseHandle = vm.unwrapResult(result);
    const resolvedResult = await vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    const resolvedHandle = vm.unwrapResult(resolvedResult);
    resolvedHandle.dispose();
  } catch (error) {
    error.__isQuickJS = true;
    scriptError = error;
  }

  // Fire-and-forget work the script abandoned is neither awaited nor killed:
  // the run returns now and the context stays parked until that work settles,
  // then disposes. Disposing earlier would let a late host callback touch a
  // freed context. A teardown throw must not replace the script's own error,
  // and once the run has returned it can only be logged.
  const disposeContext = (background) => {
    try {
      managedQuickJsContext.dispose();
    } catch (teardownError) {
      const recycled = recycleQuickJSModuleOnAbort(teardownError, quickJsModule);
      if (!background && !scriptError && !recycled) {
        scriptError = teardownError;
      } else {
        console.error('Error disposing QuickJS context', teardownError);
      }
    }
  };

  if (managedQuickJsContext) {
    if (managedQuickJsContext.hasPendingDeferreds()) {
      managedQuickJsContext.waitForPendingDeferreds().then(() => disposeContext(true));
    } else {
      disposeContext(false);
    }
  }

  if (scriptError) {
    throw scriptError;
  }
};

module.exports = {
  executeQuickJsVm,
  executeQuickJsVmAsync,
  loader
};
