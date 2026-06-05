const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');
const addLocalModuleLoaderShimToContext = require('./shims/local-module');
const { getRequireCode } = require('./shims/require');
const { newQuickJSWASMModule, memoizePromiseFactory } = require('quickjs-emscripten');

// execute `npm run sandbox:bundle-libraries` if the below file doesn't exist
const getBundledCode = require('../bundle-browser-rollup');
const addPathShimToContext = require('./shims/lib/path');
const { marshallToVm } = require('./utils');
const addCryptoUtilsShimToContext = require('./shims/lib/crypto-utils');
const { wrapScriptInClosure, SANDBOX } = require('../../utils/sandbox');

let QuickJSModule;
const loader = memoizePromiseFactory(() => newQuickJSWASMModule());
loader().then((mod) => (QuickJSModule = mod));

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

  let vm;
  try {
    vm = QuickJSModule.newContext();
    const { bru, req, res, ...variables } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);

    Object.entries(variables)?.forEach(([key, value]) => {
      const handle = marshallToVm(value, vm);
      vm.setProp(vm.global, key, handle);
      handle.dispose();
    });

    const templateLiteralText = `\`${externalScript}\``;
    const jsExpressionText = `${externalScript}`;

    let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const result = vm.evalCode(scriptText);
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
    // QuickJS contexts hold WASM (native) memory that V8's GC cannot reclaim.
    // The context must be disposed explicitly or RSS grows linearly per execution.
    vm?.dispose();
  }
};

const executeQuickJsVmAsync = async ({ script: externalScript, context: externalContext, collectionPath, scriptPath }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  let vm;
  try {
    const module = await loader();
    vm = module.newContext();

    // add crypto utilities required by the crypto-js library in bundledCode
    await addCryptoUtilsShimToContext(vm);

    const bundledCode = getBundledCode?.toString() || '';

    const setupResult = vm.evalCode(
      `
        (${bundledCode})()
        ${getRequireCode()}
      `
    );
    // Dispose the setup eval result handle; leaving it alive keeps the context
    // referenced and blocks vm.dispose() (memory leak root cause).
    (setupResult.error || setupResult.value)?.dispose();

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

    const result = vm.evalCode(script, scriptPath);
    const promiseHandle = vm.unwrapResult(result);
    const resolvedResult = await vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    const resolvedHandle = vm.unwrapResult(resolvedResult);
    resolvedHandle.dispose();
    return;
  } catch (error) {
    error.__isQuickJS = true;
    throw error;
  } finally {
    // QuickJS contexts hold WASM (native) memory that V8's GC cannot reclaim.
    // The context must be disposed explicitly or RSS grows linearly per execution.
    vm?.dispose();
  }
};

module.exports = {
  executeQuickJsVm,
  executeQuickJsVmAsync,
  loader
};
