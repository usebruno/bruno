/**
 * Evaluates code in a QuickJS VM and returns the dumped result.
 * Handles unwrapping and disposing of handles automatically.
 *
 * @param {Object} vm - QuickJS VM context
 * @param {string} code - JavaScript code to evaluate
 * @returns {*} The evaluated and dumped result
 */
function evalAndDump(vm, code) {
  const result = vm.evalCode(code);
  const handle = vm.unwrapResult(result);
  const value = vm.dump(handle);
  handle.dispose();
  return value;
}

/**
 * Creates a helper function bound to a specific VM instance.
 * Useful in beforeEach to create a test-scoped helper.
 *
 * @param {Object} vm - QuickJS VM context
 * @returns {Function} evalAndDump function bound to the VM
 */
function createEvalHelper(vm) {
  return (code) => evalAndDump(vm, code);
}

module.exports = {
  evalAndDump,
  createEvalHelper
};
