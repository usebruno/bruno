const { expect } = require('@jest/globals');
const os = require('os');
const path = require('path');
const Bru = require('../src/bru');
const BrunoResponse = require('../src/bruno-response');

const TEST_COLLECTION_PATH = path.join(os.tmpdir(), 'bruno-quickjs-tests');

// GC-class allocators only: these are the object types whose live handles
// trip the gc_obj_list assert in JS_FreeRuntime.
const CAPTURED_ALLOCATORS = ['newObject', 'newArray', 'newFunction'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RUNTIME_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;

const makeLargeResponse = () =>
  new BrunoResponse({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'text/plain' },
    data: 'WAR AND PEACE '.repeat(Math.ceil((3 * 1024 * 1024) / 14)),
    responseTime: 12
  });

const OOM_SCRIPT = `
  const body = res.getBody();
  let blob = body;
  for (let i = 0; i < 8; i++) {
    blob = blob + blob;
  }
  bru.setVar('len', blob.length);
`;

const makeBru = () =>
  new Bru({
    runtime: 'quickjs',
    envVariables: {},
    runtimeVariables: {},
    processEnvVars: {},
    collectionPath: TEST_COLLECTION_PATH,
    collectionName: 'Test'
  });

// Fresh module per test so a trapped instance can't poison the next case.
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

const runInSandbox = async ({ script, scriptType, context, hangLimitMs = 5000 }) => {
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
    .executeQuickJsVmAsync({ script, context, collectionPath: TEST_COLLECTION_PATH })
    .then(() => null, (error) => error)
    .then((error) => ({ status: 'settled', error }));
  // Race the run against an alarm so a blocked run surfaces as a readable
  // { status: 'hung' } assertion failure instead of a jest timeout.
  let hangTimer;
  const outcome = await Promise.race([
    settled,
    new Promise((resolve) => {
      hangTimer = setTimeout(() => resolve({ status: 'hung' }), hangLimitMs);
    })
  ]);
  clearTimeout(hangTimer);
  return { ...outcome, ...captured };
};

const runOomScript = (sandbox) =>
  sandbox
    .executeQuickJsVmAsync({
      script: OOM_SCRIPT,
      context: { bru: makeBru(), res: makeLargeResponse() },
      collectionPath: TEST_COLLECTION_PATH
    })
    .then(() => null, (error) => error);

// Records every unhandledRejection dispatched while fn runs (plus one extra
// tick, since the events arrive a tick late) and returns them.
const collectUnhandledRejections = async (fn) => {
  const rejections = [];
  const onUnhandled = (error) => rejections.push(error);
  process.on('unhandledRejection', onUnhandled);
  try {
    await fn();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
  return rejections;
};

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
  TEST_COLLECTION_PATH,
  RUNTIME_MEMORY_LIMIT_BYTES,
  makeBru,
  loadSandbox,
  captureAllocations,
  runInSandbox,
  runOomScript,
  collectUnhandledRejections,
  expectSettledWithoutAbort,
  expectAllDead,
  expectCleanTeardown,
  expectEventuallyClean
};
