const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addConsoleShimToContext = require('./shims/console');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const addLibraryShimsToContext = require('./shims/lib');
const addLocalModuleLoaderShimToContext = require('./shims/local-module');
const { newQuickJSWASMModule, memoizePromiseFactory } = require('quickjs-emscripten');

// execute `npm run sandbox:bundle-libraries` if the below file doesn't exist
const getBundledCode = require('../bundle-browser-rollup');
const addPathShimToContext = require('./shims/lib/path');
const { marshallToVm } = require('./utils');

let QuickJSSyncContext;
const loader = memoizePromiseFactory(() => newQuickJSWASMModule());
const getContext = (opts) => loader().then((mod) => (QuickJSSyncContext = mod.newContext(opts)));
getContext();

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const removeQuotes = (str) => {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
};

const executeQuickJsVm = ({ script: externalScript, context: externalContext, scriptType = 'template-literal' }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  if (!isNaN(Number(externalScript))) {
    return Number(externalScript);
  }

  if (externalScript === 'true') return true;
  if (externalScript === 'false') return false;
  if (externalScript === 'null') return null;
  if (externalScript === 'undefined') return undefined;

  externalScript = removeQuotes(externalScript);

  const vm = QuickJSSyncContext;

  try {
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
  }
};

const executeQuickJsVmAsync = async ({ script: externalScript, context: externalContext, collectionPath }) => {
  if (!externalScript?.length || typeof externalScript !== 'string') {
    return externalScript;
  }
  externalScript = externalScript?.trim();

  if (!isNaN(Number(externalScript))) {
    return toNumber(externalScript);
  }

  if (externalScript === 'true') return true;
  if (externalScript === 'false') return false;
  if (externalScript === 'null') return null;
  if (externalScript === 'undefined') return undefined;

  externalScript = removeQuotes(externalScript);

  try {
    const module = await newQuickJSWASMModule();
    const vm = module.newContext();

    const bundledCode = getBundledCode?.toString() || '';
    const moduleLoaderCode = function () {
      return `
        globalThis.require = (mod) => {
          let lib = globalThis.requireObject[mod];
          let isModuleAPath = (module) => (module?.startsWith('.') || module?.startsWith?.(bru.cwd()))
          if (lib) {
            return lib;
          }
          else if (isModuleAPath(mod)) {
            // fetch local module
            let localModuleCode = globalThis.__brunoLoadLocalModule(mod);

            // compile local module as iife
            (function (){
              const initModuleExportsCode = "const module = { exports: {} };"
              const copyModuleExportsCode = "\\n;globalThis.requireObject[mod] = module.exports;";
              const patchedRequire = ${`
                "\\n;" +
                "let require = (subModule) => isModuleAPath(subModule) ? globalThis.require(path.resolve(bru.cwd(), mod, '..', subModule)) : globalThis.require(subModule)" +
                "\\n;" 
              `}
              eval(initModuleExportsCode + patchedRequire + localModuleCode + copyModuleExportsCode);
            })();

            // resolve module
            return globalThis.requireObject[mod];
          }
          else {
            throw new Error("Cannot find module " + mod);
          }
        }
      `;
    };

    vm.evalCode(
      `
        (${bundledCode})()
        ${moduleLoaderCode()}
      `
    );

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);
    consoleFn && addConsoleShimToContext(vm, consoleFn);
    addLocalModuleLoaderShimToContext(vm, collectionPath);
    addPathShimToContext(vm);

    await addLibraryShimsToContext(vm);

    test && __brunoTestResults && addTestShimToContext(vm, __brunoTestResults);

    const script = `
      (async () => {
        const setTimeout = async(fn, timer) => {
          v = await bru.sleep(timer);
          fn.apply();
        }
        await bru.sleep(0);
        try {
          ${externalScript}
        }
        catch(error) {
          console?.debug?.('quick-js:execution-end:with-error', error?.message);
          throw new Error(error?.message);
        }
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
    return;
  } catch (error) {
    console.error('Error executing the script!', error);
    throw new Error(error);
  }
};

module.exports = {
  executeQuickJsVm,
  executeQuickJsVmAsync
};
