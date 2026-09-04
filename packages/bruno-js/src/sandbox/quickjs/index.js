const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addBrunoGrpcShimToContext = require('./shims/bruno-grpc');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');
const addLocalModuleLoaderShimToContext = require('./shims/local-module');
const { getRequireCode } = require('./shims/require');
const { newQuickJSWASMModuleFromVariant, newVariant, RELEASE_SYNC } = require('quickjs-emscripten');

// The engine prints its dispose-abort assertion to stderr on its own. Swallow
// that line on the CLI, where stderr is the user's screen and a handled trap
// would read as a crash; keep it in the app, whose console is not user facing.
const isElectronHost = Boolean(process.versions.electron);
const isContainedAbortLine = (line) =>
  String(line).includes('list_empty(&rt->gc_obj_list)') && String(line).includes('JS_FreeRuntime');
const quietEngineVariant = newVariant(RELEASE_SYNC, {
  emscriptenModule: {
    printErr: (line) => {
      if (isElectronHost || !isContainedAbortLine(line)) {
        console.error(line);
      }
    }
  }
});

// execute `npm run sandbox:bundle-libraries` if the below file doesn't exist
const getBundledCode = require('../bundle-browser-rollup');
const addPathShimToContext = require('./shims/lib/path');
const { marshallToVm, createManagedQuickJsContext } = require('./utils');
const addCryptoUtilsShimToContext = require('./shims/lib/crypto-utils');
const { wrapScriptInClosure, SANDBOX } = require('../../utils/sandbox');

let QuickJSModule;
let quickJSModulePromise;
let quickJSModuleLoading = false;
let quickJSModuleRecycleCount = 0;

// Memoized WASM module for sync + async. reload swaps with no gap; failed
// reload restores the old memo, failed initial load clears it.
const loader = ({ reload = false } = {}) => {
  if (!quickJSModulePromise || (reload && !quickJSModuleLoading)) {
    const previousPromise = quickJSModulePromise;
    quickJSModuleLoading = true;
    quickJSModulePromise = newQuickJSWASMModuleFromVariant(quietEngineVariant)
      .then((mod) => {
        QuickJSModule = mod;
        return mod;
      })
      .catch((loadError) => {
        console.error(reload ? 'QuickJS module reload failed' : 'QuickJS module load failed', loadError);
        quickJSModulePromise = reload ? previousPromise : null;
        if (quickJSModulePromise) {
          return quickJSModulePromise;
        }
        throw loadError;
      })
      .finally(() => {
        quickJSModuleLoading = false;
      });
  }
  return quickJSModulePromise;
};
loader().catch(() => {});

// On dispose WASM trap, recycle the module (old one keeps serving until ready).
const recycleQuickJSModuleOnAbort = (teardownError, ownerModule) => {
  if (!(teardownError instanceof WebAssembly.RuntimeError)) {
    return false;
  }
  // Skip if this module was already replaced.
  if (!ownerModule || ownerModule === QuickJSModule) {
    quickJSModuleRecycleCount += 1;
    console.warn(
      quickJSModuleRecycleCount === 1
        ? 'QuickJS engine crashed during cleanup and was replaced; the run was not affected'
        : `QuickJS engine replaced again (${quickJSModuleRecycleCount} this session)`
    );
    loader({ reload: true }).catch(() => {});
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
      if (!recycleQuickJSModuleOnAbort(teardownError, quickJsModule)) {
        console.error('Error disposing QuickJS context', teardownError);
      }
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
    bru?.grpc && addBrunoGrpcShimToContext(vm, bru.grpc);
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

  // The run waits for every pending deferred before returning: un-awaited
  // async work is the user's choice, and the run is not done until it is.
  // The wait is unbounded by design; cancelling the request is the way out.
  if (managedQuickJsContext) {
    // No try/catch: every awaited settle promise is pre-caught at creation
    // (trackPendingDeferreds), so this await cannot reject and skip dispose.
    await managedQuickJsContext.waitForPendingDeferreds();
    try {
      managedQuickJsContext.dispose();
    } catch (teardownError) {
      const recycled = recycleQuickJSModuleOnAbort(teardownError, quickJsModule);
      if (!scriptError && !recycled) {
        scriptError = teardownError;
      } else if (!recycled) {
        console.error('Error disposing QuickJS context', teardownError);
      }
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
