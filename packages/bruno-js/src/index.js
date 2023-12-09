const ScriptRuntime = require('./runtime/script-runtime');
const TestRuntime = require('./runtime/test-runtime');
const VarsRuntime = require('./runtime/vars-runtime');
const AssertRuntime = require('./runtime/assert-runtime');
const interpolateString = require('./interpolate-string');

module.exports = {
  ScriptRuntime,
  TestRuntime,
  VarsRuntime,
  AssertRuntime,
  interpolateString
};
