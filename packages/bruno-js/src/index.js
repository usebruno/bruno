const ScriptRuntime = require('./runtime/script-runtime');
const TestRuntime = require('./runtime/test-runtime');
const VarsRuntime = require('./runtime/vars-runtime');
const AssertRuntime = require('./runtime/assert-runtime');
const { runScript } = require('./runtime/node-vm');

module.exports = {
  ScriptRuntime,
  TestRuntime,
  VarsRuntime,
  AssertRuntime,
  runScript
};
