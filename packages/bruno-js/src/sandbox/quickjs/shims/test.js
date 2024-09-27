const { marshallToVm } = require('../utils');

const addBruShimToContext = (vm, __brunoTestResults) => {
  let addResult = vm.newFunction('addResult', function (v) {
    __brunoTestResults.addResult(vm.dump(v));
  });
  vm.setProp(vm.global, '__bruno__addResult', addResult);
  addResult.dispose();

  let getResults = vm.newFunction('getResults', function () {
    return marshallToVm(__brunoTestResults.getResults(), vm);
  });
  vm.setProp(vm.global, '__bruno__getResults', getResults);
  getResults.dispose();

  vm.evalCode(
    `
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
    `
  );
};

module.exports = addBruShimToContext;
