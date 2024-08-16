const addTestShimToContext = async (context, __brunoTestResults) => {
  context.global.setSync('addResult', function (v) {
    __brunoTestResults.addResult(v);
  });

  context.global.setSync('getResults', function () {
    return __brunoTestResults.getResults();
  });

  context.evalSync(`
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
        // console.log(error);
      }
    };

    globalThis.test = Test(__brunoTestResults);
  `);
};

module.exports = addTestShimToContext;
