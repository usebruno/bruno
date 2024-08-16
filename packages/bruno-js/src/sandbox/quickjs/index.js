const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');
const { newQuickJSWASMModule, memoizePromiseFactory } = require('quickjs-emscripten');

// execute `npm run build:isolated-vm:inbuilt-modules` if the below file doesn't exist
const getBundledCode = require('../../bundle-browser-rollup');

let QuickJSSyncContext;
const loader = memoizePromiseFactory(() => newQuickJSWASMModule());
const getContext = (opts) => loader().then((mod) => (QuickJSSyncContext = mod.newContext(opts)));
getContext();

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const executeQuickJsVm = ({ script: externalScript, context: externalContext, scriptType = 'script' }) => {
  if (!isNaN(Number(externalScript))) {
    return Number(externalScript);
  }

  const vm = QuickJSSyncContext;

  try {
    const { bru, req, res } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);

    ////////////////////////////////////////////////////////////////////////////////

    const logHandle = vm.newFunction('log', (...args) => {
      const nativeArgs = args.map(vm.dump);
      console.log(...nativeArgs);
    });
    vm.setProp(vm.global, 'log', logHandle);
    logHandle.dispose();

    ////////////////////////////////////////////////////////////////////////////////

    const templateLiteralText = `\`${externalScript}\`;`;

    const jsExpressionText = `${externalScript};`;

    let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const result = vm.evalCode(scriptText);
    if (result.error) {
      let e = vm.dump(result.error);
      result.error.dispose();
      return e;
    } else {
      let v = vm.dump(result.value);
      let vString = v.toString();
      result.value.dispose();
      return v;
    }
  } catch (error) {
    console.error('Error executing the script!', error);
  }
  // });
};

const executeQuickJsVmAsync = async ({
  script: externalScript,
  context: externalContext,
  modules = {},
  scriptType = 'script'
}) => {
  if (!isNaN(Number(externalScript))) {
    return toNumber(externalScript);
  }
  try {
    const module = await newQuickJSWASMModule();
    const vm = module.newContext();

    const bundledCode = getBundledCode?.toString() || '';
    let bundledScript = `
      (${bundledCode})()
    `;

    bundledScript += `
      globalThis.require = (module) => {
        return globalThis.requireObject[module];
      }
    `;

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);
    consoleFn && addConsoleShimToContext(vm, consoleFn);

    // await addLibraryShimsToContext(context);

    test && __brunoTestResults && addTestShimToContext(vm, __brunoTestResults);

    bundledScript += `
    globalThis.expect = require('chai').expect;
    globalThis.assert = require('chai').assert;

    globalThis.__brunoTestResults = {
      addResult: globalThis.__bruno__addResult,
      getResults: globalThis.__bruno__getResults,
    }

    globalThis.DummyChaiAssertionError = class DummyChaiAssertionError extends Error {
      constructor(message, props, ssf) {
        super(message);
        this.name = "AssertionError";
        Object.assign(this, props);
      }
    }

    globalThis.Test = (__brunoTestResults) => async (description, callback) => {
      try {
        await callback();
        __brunoTestResults.addResult({ description, status: "pass" });
      } catch (error) {
        if (error instanceof DummyChaiAssertionError) {
          const { message, actual, expected } = error;
          __brunoTestResults.addResult({
            description,
            status: "fail",
            error: message,
            actual,
            expected,
          });
        } else {
          globalThis.__bruno__addResult({
            description,
            status: "fail",
            error: error.message || "An unexpected error occurred.",
          });
        }
      }
    };

    globalThis.test = Test(__brunoTestResults);
  `;

    ////////////////////////////////////////////////////////////////////////////////

    const sleep = vm.newFunction('sleep', (timer) => {
      const t = vm.getString(timer);
      const promise = vm.newPromise();
      setTimeout(() => {
        promise.resolve(vm.newString('slept'));
      }, t);
      promise.settled.then(vm.runtime.executePendingJobs);
      return promise.handle;
    });
    sleep.consume((handle) => vm.setProp(vm.global, 'sleep', handle));

    ////////////////////////////////////////////////////////////////////////////////

    const script = `
      ${bundledScript}
      (async () => {
        const setTimeout = async(fn, timer) => {
          v = await sleep(timer);
          fn.apply();
        }
        await sleep(0);
        console?.debug && console.debug('quick-js:execution-start:');
        try {
          ${externalScript}
        }
        catch(error) {
          console?.debug && console.debug('quick-js:execution-end:with-error', error?.message);
        }
        console?.debug && console.debug('quick-js:execution-end:');
        return 'done';
      })()
    `;

    const result = vm.evalCode(script);
    const promiseHandle = vm.unwrapResult(result);
    const resolvedResult = await vm.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    const resolvedHandle = vm.unwrapResult(resolvedResult);
    resolvedHandle.dispose();
    // vm.dispose();
    return 'foo';
  } catch (error) {
    console.error('Error executing the script!', error);
  }
};

module.exports = {
  executeQuickJsVm,
  executeQuickJsVmAsync
};
