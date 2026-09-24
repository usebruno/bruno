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

  it('reports the recycle count only from the second trap onward', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { sandbox } = await loadSandbox((vm) => {
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
    });

    await runOomScript(sandbox);
    await sandbox.loader();
    await runOomScript(sandbox);

    const warns = warnSpy.mock.calls.map((args) => String(args[0]));
    expect(warns[0]).toBe('QuickJS engine crashed during cleanup and was replaced; the run was not affected');
    expect(warns[1]).toBe('QuickJS engine replaced again (2 this session)');
  }, 30000);

  it('swallows only the exact dispose abort line and forwards all other engine stderr', () => {
    jest.resetModules();
    const actual = jest.requireActual('quickjs-emscripten');
    let enginePrintErr;
    jest.doMock('quickjs-emscripten', () => ({
      ...actual,
      newVariant: (base, options) => {
        enginePrintErr = options.emscriptenModule.printErr;
        return actual.newVariant(base, options);
      }
    }));
    require('../src/sandbox/quickjs');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    enginePrintErr('some other engine warning');
    enginePrintErr('Aborted(Assertion failed: list_empty(&rt->gc_obj_list), at: ../../vendor/quickjs/quickjs.c,2036,JS_FreeRuntime)');
    enginePrintErr('Aborted(Assertion failed: list_empty(&rt->gc_obj_list), at: somewhere else)');
    enginePrintErr('Aborted(some future assertion in JS_FreeRuntime)');

    expect(errorSpy.mock.calls.map((args) => args[0])).toEqual([
      'some other engine warning',
      'Aborted(Assertion failed: list_empty(&rt->gc_obj_list), at: somewhere else)',
      'Aborted(some future assertion in JS_FreeRuntime)'
    ]);
  });

  it('prints the contained abort in electron hosts and swallows it on the cli', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const abortLinesFromTrap = async () => {
      const { sandbox } = await loadSandbox((vm) => {
        vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
      });
      errorSpy.mockClear();
      await runOomScript(sandbox);
      return errorSpy.mock.calls.filter((args) => String(args[0]).includes('list_empty(&rt->gc_obj_list)'));
    };

    expect(await abortLinesFromTrap()).toEqual([]);

    Object.defineProperty(process.versions, 'electron', { value: 'test', configurable: true });
    try {
      expect((await abortLinesFromTrap()).length).toBeGreaterThan(0);
    } finally {
      delete process.versions.electron;
    }
  }, 30000);

  it('keeps the old module serving when the replacement build fails', async () => {
    const actual = jest.requireActual('quickjs-emscripten');
    let builds = 0;
    jest.doMock('quickjs-emscripten', () => ({
      ...actual,
      newQuickJSWASMModuleFromVariant: (...args) => {
        builds += 1;
        return builds === 2
          ? Promise.reject(new Error('wasm build failed'))
          : actual.newQuickJSWASMModuleFromVariant(...args);
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

  // Import-time loader() is fire-and-forget: a failed first build must clear the
  // memo so a later await loader() retries instead of reusing a rejected promise.
  it('clears the memo after a failed initial load so a later loader() can retry', async () => {
    const actual = jest.requireActual('quickjs-emscripten');
    let builds = 0;
    jest.doMock('quickjs-emscripten', () => ({
      ...actual,
      newQuickJSWASMModuleFromVariant: (...args) => {
        builds += 1;
        return builds === 1
          ? Promise.reject(new Error('wasm initial build failed'))
          : actual.newQuickJSWASMModuleFromVariant(...args);
      }
    }));

    const unhandledRejections = await collectUnhandledRejections(async () => {
      jest.resetModules();
      const sandbox = require('../src/sandbox/quickjs');
      // Let the import-time loader settle and clear the memo.
      await new Promise((resolve) => setImmediate(resolve));
      expect(builds).toBe(1);

      const module = await sandbox.loader();
      expect(module).toBeTruthy();
      expect(builds).toBe(2);
    });
    expect(unhandledRejections).toEqual([]);
  });

  it('coalesces concurrent recycles into a single replacement build', async () => {
    const actual = jest.requireActual('quickjs-emscripten');
    let builds = 0;
    let releaseReload;
    const reloadGate = new Promise((resolve) => {
      releaseReload = resolve;
    });

    jest.doMock('quickjs-emscripten', () => ({
      ...actual,
      newQuickJSWASMModuleFromVariant: (...args) => {
        builds += 1;
        if (builds === 1) {
          return actual.newQuickJSWASMModuleFromVariant(...args);
        }
        return reloadGate.then(() => actual.newQuickJSWASMModuleFromVariant(...args));
      }
    }));

    let trapNextDispose = false;
    const { sandbox } = await loadSandbox((vm) => {
      vm.runtime.setMemoryLimit(RUNTIME_MEMORY_LIMIT_BYTES);
      const originalDispose = vm.dispose.bind(vm);
      vm.dispose = () => {
        if (trapNextDispose) {
          trapNextDispose = false;
          throw new WebAssembly.RuntimeError('Aborted(manufactured trap)');
        }
        originalDispose();
      };
    });
    expect(builds).toBe(1);

    await runOomScript(sandbox);
    expect(builds).toBe(2);

    trapNextDispose = true;
    // The sync path reads the module directly; it cannot await the gated loader.
    sandbox.executeQuickJsVm({ script: '1 + 1', context: {}, scriptType: 'expression' });
    expect(builds).toBe(2);

    releaseReload();
    await sandbox.loader();
    expect(builds).toBe(2);
  }, 30000);

  it('preserves the script error when foreground dispose also fails', async () => {
    const { sandbox, wasmModule } = await loadSandbox((vm) => {
      vm.dispose = () => {
        throw new Error('dispose failed');
      };
    });

    await expect(
      sandbox.executeQuickJsVmAsync({
        script: 'throw new Error("boom");',
        context: { bru: makeBru() },
        collectionPath: TEST_COLLECTION_PATH
      })
    ).rejects.toThrow('boom');

    expect(await sandbox.loader()).toBe(wasmModule);
  });
});
