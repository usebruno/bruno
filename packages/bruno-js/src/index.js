const VarsRuntime = require('./runtime/vars-runtime');
const AssertRuntime = require('./runtime/assert-runtime');
const { runScript } = require('./runtime/vm-helper');

module.exports = {
  VarsRuntime,
  AssertRuntime,
  runScript
};
