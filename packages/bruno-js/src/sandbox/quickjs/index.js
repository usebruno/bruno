const ivm = require('isolated-vm');
const addBruShimToContext = require('./shims/bru');
const addBrunoRequestShimToContext = require('./shims/bruno-request');
const addBrunoResponseShimToContext = require('./shims/bruno-response');
const addTestShimToContext = require('./shims/test');
const { newQuickJSAsyncWASMModule } = require('quickjs-emscripten');

// execute `npm run build:isolated-vm:inbuilt-modules` if the below file doesn't exist
const getBundledCode = require('../bundle-browser-rollup');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isInteger(num) ? parseInt(value, 10) : parseFloat(value);
};

const executeQuickJsVm = ({ script: externalScript, context: externalContext }) => {
  if (!isNaN(Number(externalScript))) {
    return Number(externalScript);
  }
  let result;
  const isolate = new ivm.Isolate();
  try {
    const context = isolate.createContextSync();
    context.global.setSync('global', context.global.derefInto());

    const { bru, req, res } = externalContext;

    context.evalSync(`
      let bru = {};
      let req = {};
      let res = {};
    `);

    bru && addBruShimToContext(context, bru);
    req && addBrunoRequestShimToContext(context, req);
    res && addBrunoResponseShimToContext(context, res);

    context.global.setSync('setResult', function (arg) {
      result = arg;
    });

    const templateLiteralText = `
      let value = \`${externalScript}\`;
      setResult(value);
    `;

    const jsExpressionText = `
      let value = ${externalScript};
      setResult(value);
    `;

    let scriptText = scriptType === 'template-literal' ? templateLiteralText : jsExpressionText;

    const script = isolate.compileScriptSync(scriptText);
    script.runSync(context);
    return result;
  } catch (error) {
    console.error('Error executing the script!', error);
  }
  isolate.dispose();
};

const executeQuickJsVmAsync = async ({
  script: externalScript,
  context: externalContext
}) => {
  if (!isNaN(Number(externalScript))) {
    return toNumber(externalScript);
  }
  try {
    const module = await newQuickJSAsyncWASMModule()
    const runtime = module.newRuntime()
    const vm = runtime.newContext()
    
    const bundledCode = getBundledCode?.toString() || '';
    let bundledScript = `(${bundledCode})()`;

    bundledScript += `
      globalThis.require = (module) => {
        return globalThis.requireObject[module];
      }
    `;

    bundledScript += `
      let bru = {
        cwd: __bruno__cwd,
        getEnvName: __bruno__getEnvName,
        getProcessEnv: __bruno__getProcessEnv,
        getEnvVar: __bruno__getEnvVar,
        setEnvVar: __bruno__setEnvVar,
        getVar: __bruno__getVar,
        setVar: __bruno__setVar,
        setNextRequest: __bruno__setNextRequest,
        visualize: __bruno__visualize,
        getSecretVar: __bruno__getSecretVar
      };
      let req = {
        url: __bruno__req__url,
        method: __bruno__req__method,
        headers: __bruno__req__headers,
        body: __bruno__req__body,
        timeout: __bruno__req__timeout,
        getUrl: __bruno__req__getUrl,
        setUrl: __bruno__req__setUrl,
        getMethod: __bruno__req__getMethod,
        setMethod: __bruno__req__setMethod,
        getAuthMode: __bruno__req__getAuthMode,
        getHeaders: __bruno__req__getHeaders,
        setHeaders: __bruno__req__setHeaders,
        getHeader: __bruno__req__getHeader,
        setHeader: __bruno__req__setHeader,
        getBody: __bruno__req__getBody,
        setBody: __bruno__req__setBody,
        setMaxRedirects: __bruno__req__setMaxRedirects,
        getTimeout: __bruno__req__getTimeout,
        setTimeout: __bruno__req__setTimeout
      };
      let res = {
        status: globalThis.__bruno__res__status,
        headers: globalThis.__bruno__res__headers,
        body: globalThis.__bruno__res__body,
        responseTime: globalThis.__bruno__res__responseTime,
        getStatus: globalThis.__bruno__res__getStatus,
        getHeader: globalThis.__bruno__res__getHeader,
        getHeaders: globalThis.__bruno__res__getHeaders,
        getBody: globalThis.__bruno__res__getBody,
        getResponseTime: globalThis.__bruno__res__getResponseTime
      };
    `;

    const { bru, req, res, test, __brunoTestResults, console: consoleFn } = externalContext;

    bru && addBruShimToContext(vm, bru);
    req && addBrunoRequestShimToContext(vm, req);
    res && addBrunoResponseShimToContext(vm, res);

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

      globalThis.Test = (__brunoTestResults) => (description, callback) => {
        try {
          callback();
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
            __brunoTestResults.addResult({
              description,
              status: "fail",
              error: error.message || "An unexpected error occurred.",
            });
          }
          // console.log(error);
        }
      };
      
      globalThis.test = Test(__brunoTestResults);
    `;

    bundledScript += externalScript;

    const result = await vm.evalCodeAsync(bundledScript);
    if (result.error) {
      console.log("Execution failed:", vm.dump(result.error))
      result.error.dispose()
    } else {
      result.value.dispose();
    }
    vm.dispose();
    return result;
  } catch (error) {
    console.error('Error executing the script!', error);
  }
};

module.exports = {
  executeQuickJsVm,
  executeQuickJsVmAsync
};
