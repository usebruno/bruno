// Sandbox script wrapping utilities for Node VM and QuickJS.
// Line offsets are computed from the prefix strings so error-formatter.js can map
// VM-reported line numbers back to the original .bru/.yml source lines.

const SANDBOX = Object.freeze({
  NODEVM: 'nodevm',
  QUICKJS: 'quickjs'
});

// -- Node VM --

const NODEVM_SCRIPT_PREFIX = `
        (async function(){
          `;

const NODEVM_SCRIPT_SUFFIX = `
        })();
      `;

// -- QuickJS --

const QUICKJS_SCRIPT_PREFIX = `
      (async () => {
        const setTimeout = async(fn, timer) => {
          v = await bru.sleep(timer);
          fn.apply();
        }

        await bru.sleep(0);
        try {
          `;

const QUICKJS_SCRIPT_SUFFIX = `
        }
        catch(error) {
          throw error;
        }
        return 'done';
      })()
    `;

// Computed offsets — number of newlines before user script in each wrapper
const NODEVM_SCRIPT_WRAPPER_OFFSET = NODEVM_SCRIPT_PREFIX.split('\n').length - 1;
const QUICKJS_SCRIPT_WRAPPER_OFFSET = QUICKJS_SCRIPT_PREFIX.split('\n').length - 1;

/**
 * Wraps a script in the appropriate sandbox closure.
 * @param {string} script - The script code to wrap
 * @param {'nodevm'|'quickjs'} sandbox - The sandbox runtime to wrap for
 * @returns {string} The wrapped script
 */
const wrapScriptInClosure = (script, sandbox) => {
  if (sandbox === SANDBOX.QUICKJS) {
    return QUICKJS_SCRIPT_PREFIX + script + QUICKJS_SCRIPT_SUFFIX;
  }
  return NODEVM_SCRIPT_PREFIX + script + NODEVM_SCRIPT_SUFFIX;
};

module.exports = {
  SANDBOX,
  wrapScriptInClosure,
  NODEVM_SCRIPT_WRAPPER_OFFSET,
  QUICKJS_SCRIPT_WRAPPER_OFFSET
};
