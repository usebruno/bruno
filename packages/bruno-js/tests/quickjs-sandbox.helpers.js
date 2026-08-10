// Harness for quickjs-teardown.spec.js: fixtures, a fresh instrumented
// sandbox per test, and the teardown assertions. The invariant these encode
// is documented in the spec.
const { expect } = require('@jest/globals');
const Bru = require('../src/bru');

// The run must return without waiting on abandoned work, so this only guards
// against a hang regression.
const TEARDOWN_HANG_LIMIT_MS = 5000;

// GC-class allocators only: these are the object types whose live handles
// trip the gc_obj_list assert in JS_FreeRuntime.
const CAPTURED_ALLOCATORS = ['newObject', 'newArray', 'newFunction'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeBru = () =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: '/',
    collectionName: 'Test'
  });

// A fresh sandbox module per test: an aborted WASM module instance is unusable
// afterwards and would cascade failures into unrelated tests. Returns the
// module too, so trap tests can assert on its identity. onVm (if given) runs
// against each context the sandbox creates, before use.
const loadSandbox = async (onVm) => {
  jest.resetModules();
  const sandbox = require('../src/sandbox/quickjs');
  const wasmModule = await sandbox.loader();
  if (onVm) {
    const originalNewContext = wasmModule.newContext.bind(wasmModule);
    jest.spyOn(wasmModule, 'newContext').mockImplementation((...args) => {
      const vm = originalNewContext(...args);
      onVm(vm);
      return vm;
    });
  }
  return { sandbox, wasmModule };
};

// Records every GC-class handle and deferred a context creates, so tests can
// assert that none survive teardown.
const captureAllocations = (vm, captured) => {
  CAPTURED_ALLOCATORS.forEach((method) => {
    const original = vm[method].bind(vm);
    vm[method] = (...args) => {
      const handle = original(...args);
      captured.handles.push(handle);
      return handle;
    };
  });
  const originalNewPromise = vm.newPromise.bind(vm);
  vm.newPromise = (...args) => {
    const deferred = originalNewPromise(...args);
    captured.deferreds.push(deferred);
    return deferred;
  };
};

// Runs one script through a fresh sandbox (async path by default, sync path
// when scriptType is given) and reports how the run settled plus everything
// the context allocated: { status, error, handles, deferreds }.
const runInSandbox = async ({ script, scriptType, context }) => {
  const captured = { handles: [], deferreds: [] };
  const { sandbox } = await loadSandbox((vm) => captureAllocations(vm, captured));

  if (scriptType) {
    let error = null;
    try {
      sandbox.executeQuickJsVm({ script, scriptType, context });
    } catch (thrown) {
      error = thrown;
    }
    return { status: 'settled', error, ...captured };
  }

  const settled = sandbox
    .executeQuickJsVmAsync({ script, context, collectionPath: '/tmp/collection' })
    .then(() => null, (error) => error)
    .then((error) => ({ status: 'settled', error }));
  let hangTimer;
  const outcome = await Promise.race([
    settled,
    new Promise((resolve) => {
      hangTimer = setTimeout(() => resolve({ status: 'hung' }), TEARDOWN_HANG_LIMIT_MS);
    })
  ]);
  clearTimeout(hangTimer);
  return { ...outcome, ...captured };
};

// The type check catches a trap however its message reads; the message net
// catches sandbox failures that surface wrapped or as other library errors.
const expectSettledWithoutAbort = ({ status, error }) => {
  expect(status).toBe('settled');
  expect(error instanceof WebAssembly.RuntimeError).toBe(false);
  expect(String(error?.message ?? '')).not.toMatch(/Aborted|gc_obj_list|QuickJSUseAfterFree/);
};

const expectAllDead = ({ handles, deferreds }) => {
  handles.forEach((handle) => expect(handle.alive).toBe(false));
  deferreds.forEach((deferred) => expect(deferred.alive).toBe(false));
};

const expectCleanTeardown = (outcome) => {
  expectSettledWithoutAbort(outcome);
  expectAllDead(outcome);
};

// Background teardown: the run has already returned; poll until the parked
// context finished its abandoned work and disposed everything.
const expectEventuallyClean = async ({ handles, deferreds }, timeoutMs = 5000) => {
  const start = Date.now();
  const allDead = () => handles.every((h) => !h.alive) && deferreds.every((d) => !d.alive);
  while (!allDead() && Date.now() - start < timeoutMs) {
    await sleep(10);
  }
  expectAllDead({ handles, deferreds });
};

module.exports = {
  makeBru,
  loadSandbox,
  captureAllocations,
  runInSandbox,
  expectSettledWithoutAbort,
  expectAllDead,
  expectCleanTeardown,
  expectEventuallyClean
};
