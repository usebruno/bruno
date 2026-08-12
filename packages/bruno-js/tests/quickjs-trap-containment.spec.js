const { describe, it, expect, afterEach } = require('@jest/globals');
const {
  TEST_COLLECTION_PATH,
  RUNTIME_MEMORY_LIMIT_BYTES,
  makeBru,
  loadSandbox,
  captureAllocations,
  runOomScript,
  collectUnhandledRejections,
  expectSettledWithoutAbort,
  expectAllDead
} = require('./quickjs-sandbox.helpers');

describe('QuickJS engine trap containment', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock('quickjs-emscripten');
  });

  it('contains an engine trap: the run reports its result, the module is replaced, the next run is healthy', async () => {
    const captured = { handles: [], deferreds: [] };
    const { sandbox, wasmModule } = await loadSandbox((vm) => {
      captureAllocations(vm, captured);
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
    });

    const error = await runOomScript(sandbox);

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

  it('keeps synchronous evaluation working while a trapped module is being replaced', async () => {
    const { sandbox, wasmModule } = await loadSandbox((vm) => {
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
    });

    await runOomScript(sandbox);

    // The replacement build cannot resolve without a macrotask turn, so a
    // synchronous call here must be served by the trapped module; the spy
    // on its newContext proves that is where the evaluation ran.
    const contextsOnTrappedModule = wasmModule.newContext.mock.calls.length;
    const out = sandbox.executeQuickJsVm({ script: '6 * 7', context: {}, scriptType: 'expression' });
    expect(out).toBe(42);
    expect(wasmModule.newContext.mock.calls.length).toBe(contextsOnTrappedModule + 1);
  }, 20000);

  it('keeps the old module serving when the replacement build fails', async () => {
    const actual = jest.requireActual('quickjs-emscripten');
    let builds = 0;
    jest.doMock('quickjs-emscripten', () => ({
      ...actual,
      newQuickJSWASMModule: (...args) => {
        builds += 1;
        return builds === 2 ? Promise.reject(new Error('wasm build failed')) : actual.newQuickJSWASMModule(...args);
      }
    }));

    const unhandledRejections = await collectUnhandledRejections(async () => {
      const { sandbox, wasmModule } = await loadSandbox((vm) => {
        vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
      });

      await runOomScript(sandbox);

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
    });
    expect(unhandledRejections).toEqual([]);
  }, 20000);

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
