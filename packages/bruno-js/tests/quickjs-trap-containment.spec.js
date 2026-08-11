const { describe, it, expect, afterEach } = require('@jest/globals');
const BrunoResponse = require('../src/bruno-response');
const {
  TEST_COLLECTION_PATH,
  makeBru,
  loadSandbox,
  captureAllocations,
  expectSettledWithoutAbort,
  expectAllDead
} = require('./quickjs-sandbox.helpers');

const RUNTIME_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;

const makeLargeResponse = () =>
  new BrunoResponse({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'text/plain' },
    data: 'WAR AND PEACE '.repeat(Math.ceil((3 * 1024 * 1024) / 14)),
    responseTime: 12
  });

// Reads a multi-MB body and grows it past the runtime memory limit, driving
// the engine into the uncatchable out-of-memory that traps dispose.
const OOM_SCRIPT = `
  const body = res.getBody();
  let blob = body;
  for (let i = 0; i < 8; i++) {
    blob = blob + blob;
  }
  bru.setVar('len', blob.length);
`;

// A WASM trap during dispose (JS_FreeRuntime aborting on engine-internal
// leftovers) leaves that module instance's heap unreliable. The sandbox must
// contain the trap and hand later runs a fresh module, and must never retire
// a module for anything less than a real trap.
describe('QuickJS engine trap containment', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The low memory limit stands in for the small initial WASM heap of a
  // freshly started process, which is what makes first runs fail in the
  // field. Both runs go through the sandbox's WASM module singleton, like
  // consecutive requests in a running app.
  it('contains an engine trap: the run reports its result, the module is replaced, the next run is healthy', async () => {
    const captured = { handles: [], deferreds: [] };
    const { sandbox, wasmModule } = await loadSandbox((vm) => {
      captureAllocations(vm, captured);
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
    });

    const error = await sandbox
      .executeQuickJsVmAsync({
        script: OOM_SCRIPT,
        context: { bru: makeBru(), res: makeLargeResponse() },
        collectionPath: TEST_COLLECTION_PATH
      })
      .then(() => null, (thrown) => thrown);

    expectSettledWithoutAbort({ status: 'settled', error });
    expectAllDead(captured);
    expect(await sandbox.loader()).not.toBe(wasmModule);

    const bru = makeBru();
    await sandbox.executeQuickJsVmAsync({
      script: 'bru.setVar("recovered", true);',
      context: { bru },
      collectionPath: TEST_COLLECTION_PATH
    });
    expect(bru.getVar('recovered')).toBe(true);
  }, 20000);

  // A recycle swaps the module without a gap: the trapped instance still
  // evaluates correctly and keeps serving the synchronous executor (which
  // cannot await the replacement) until the fresh module resolves.
  it('keeps synchronous evaluation working while a trapped module is being replaced', async () => {
    const { sandbox } = await loadSandbox((vm) => {
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
    });

    await sandbox
      .executeQuickJsVmAsync({
        script: OOM_SCRIPT,
        context: { bru: makeBru(), res: makeLargeResponse() },
        collectionPath: TEST_COLLECTION_PATH
      })
      .catch(() => {});

    const out = sandbox.executeQuickJsVm({ script: '6 * 7', context: {}, scriptType: 'expression' });
    expect(out).toBe(42);
  }, 20000);

  // A rejected replacement build must not poison the sandbox: the old,
  // still-functional module keeps serving and no rejection escapes unhandled.
  it('keeps the old module serving when the replacement build fails', async () => {
    const unhandledRejections = [];
    const onUnhandled = (error) => unhandledRejections.push(error);
    process.on('unhandledRejection', onUnhandled);
    try {
      jest.resetModules();
      const actual = jest.requireActual('quickjs-emscripten');
      let builds = 0;
      jest.doMock('quickjs-emscripten', () => ({
        ...actual,
        newQuickJSWASMModule: (...args) => {
          builds += 1;
          return builds === 2 ? Promise.reject(new Error('wasm build failed')) : actual.newQuickJSWASMModule(...args);
        }
      }));
      const sandbox = require('../src/sandbox/quickjs');
      const wasmModule = await sandbox.loader();
      const originalNewContext = wasmModule.newContext.bind(wasmModule);
      let limitNextContext = true;
      jest.spyOn(wasmModule, 'newContext').mockImplementation((...args) => {
        const vm = originalNewContext(...args);
        if (limitNextContext) {
          vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
          limitNextContext = false;
        }
        return vm;
      });

      await sandbox
        .executeQuickJsVmAsync({
          script: OOM_SCRIPT,
          context: { bru: makeBru(), res: makeLargeResponse() },
          collectionPath: TEST_COLLECTION_PATH
        })
        .catch(() => {});

      // Guards against a vacuous pass: proves the trap really started the
      // replacement build (the one mocked to reject).
      expect(builds).toBe(2);
      expect(await sandbox.loader()).toBe(wasmModule);
      const bru = makeBru();
      await sandbox.executeQuickJsVmAsync({
        script: 'bru.setVar("stillWorks", true);',
        context: { bru },
        collectionPath: TEST_COLLECTION_PATH
      });
      expect(bru.getVar('stillWorks')).toBe(true);
      expect(builds).toBe(2);
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', onUnhandled);
      jest.dontMock('quickjs-emscripten');
    }
  }, 20000);

  // Only a WASM trap (a thrown WebAssembly.RuntimeError) may retire the
  // engine module; an ordinary teardown failure surfaces as the run's error
  // even when its message imitates one.
  it('does not replace the engine module for a non-trap teardown failure', async () => {
    const { sandbox, wasmModule } = await loadSandbox((vm) => {
      vm.dispose = () => {
        throw new Error('Aborted(imitation, not a WebAssembly.RuntimeError)');
      };
    });

    await expect(
      sandbox.executeQuickJsVmAsync({
        script: 'bru.setVar("x", 1);',
        context: { bru: makeBru() },
        collectionPath: TEST_COLLECTION_PATH
      })
    ).rejects.toThrow('Aborted(imitation, not a WebAssembly.RuntimeError)');

    expect(await sandbox.loader()).toBe(wasmModule);
  });
});
