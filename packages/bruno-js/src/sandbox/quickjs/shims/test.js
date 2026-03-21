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

  // Register custom chai assertion for isJson (expect(...).to.be.json)
  // The bundled chai only exposes { expect, assert } — no Assertion class.
  // Access the prototype through an expect() instance instead.
  vm.evalCode(
    `
      (function() {
        var proto = Object.getPrototypeOf(expect(null));
        Object.defineProperty(proto, 'json', {
          get: function () {
            var obj = this._obj;
            var isJson = typeof obj === 'object' && obj !== null && !Array.isArray(obj) &&
              Object.prototype.toString.call(obj) === '[object Object]';
            this.assert(isJson, 'expected #{this} to be JSON', 'expected #{this} not to be JSON');
            return this;
          },
          configurable: true
        });
      })();
    `
  );
  // Register custom chai assertion for jsonSchema (expect(...).to.have.jsonSchema(schema, options))
  vm.evalCode(
    `
      (function() {
        var proto = Object.getPrototypeOf(expect(null));
        proto.jsonSchema = function(schema, ajvOptions) {
          var Ajv = require('ajv');
          var ajv = new Ajv(ajvOptions || { allErrors: true });
          var validate = ajv.compile(schema);
          var data = this._obj;
          var isValid = validate(data);

          this.assert(
            isValid,
            'expected value to match JSON schema, validation errors: ' + (validate.errors ? JSON.stringify(validate.errors) : 'none'),
            'expected value to not match JSON schema'
          );
          return this;
        };
      })();
    `
  );
};

module.exports = addBruShimToContext;
