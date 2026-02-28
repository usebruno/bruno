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
  // Register custom chai assertion for jsonBody (Postman parity)
  vm.evalCode(
    `
      (function() {
        var proto = Object.getPrototypeOf(expect(null));

        function getNestedValue(obj, path) {
          var keys = path.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
          var current = obj;
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), key)) {
              return { found: false };
            }
            current = current[key];
          }
          return { found: true, value: current };
        }

        function deepEqual(a, b) {
          if (a === b) return true;
          if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
          if (Array.isArray(a) !== Array.isArray(b)) return false;
          var keysA = Object.keys(a);
          var keysB = Object.keys(b);
          if (keysA.length !== keysB.length) return false;
          for (var i = 0; i < keysA.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(b, keysA[i]) || !deepEqual(a[keysA[i]], b[keysA[i]])) return false;
          }
          return true;
        }

        proto.jsonBody = function() {
          var obj = this._obj;
          var args = Array.prototype.slice.call(arguments);
          var negate = this.__flags && this.__flags.negate;

          if (args.length === 0) {
            var pass = typeof obj === 'object' && obj !== null;
            if (negate ? pass : !pass) {
              throw new DummyChaiAssertionError(
                negate
                  ? 'expected value not to be a JSON body'
                  : 'expected value to be a JSON body (object or array)'
              );
            }
          } else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
            var pass = deepEqual(obj, args[0]);
            if (negate ? pass : !pass) {
              throw new DummyChaiAssertionError(
                negate
                  ? 'expected body to not deeply equal given object'
                  : 'expected body to deeply equal given object'
              );
            }
          } else if (args.length === 1) {
            var result = getNestedValue(obj, String(args[0]));
            if (negate ? result.found : !result.found) {
              throw new DummyChaiAssertionError(
                negate
                  ? "expected body to not have nested property '" + args[0] + "'"
                  : "expected body to have nested property '" + args[0] + "'"
              );
            }
          } else {
            var result = getNestedValue(obj, String(args[0]));
            var pass = result.found && deepEqual(result.value, args[1]);
            if (negate ? pass : !pass) {
              throw new DummyChaiAssertionError(
                negate
                  ? "expected body to not have nested property '" + args[0] + "' equal to given value"
                  : "expected body to have nested property '" + args[0] + "' equal to given value"
              );
            }
          }
          return this;
        };
      })();
    `
  );
};

module.exports = addBruShimToContext;
