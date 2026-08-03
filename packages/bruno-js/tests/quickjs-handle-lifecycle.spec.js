const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const Bru = require('../src/bru');
const {
  createManagedQuickJsContext,
  disposeQuickJsContext,
  trackQuickJsContext
} = require('../src/sandbox/quickjs/utils');

describe('QuickJS handle lifecycle utils', () => {
  let module;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  afterAll(() => {
    module = null;
  });

  describe('trackQuickJsContext', () => {
    it('tracks newObject, newArray, and newFunction handles', () => {
      const vm = module.newContext();
      const disposeTracked = trackQuickJsContext(vm);

      const objectHandle = vm.newObject();
      const arrayHandle = vm.newArray();
      const functionHandle = vm.newFunction('trackedFn', () => vm.undefined);

      expect(objectHandle.alive).toBe(true);
      expect(arrayHandle.alive).toBe(true);
      expect(functionHandle.alive).toBe(true);

      disposeTracked();

      expect(objectHandle.alive).toBe(false);
      expect(arrayHandle.alive).toBe(false);
      expect(functionHandle.alive).toBe(false);
      expect(vm.alive).toBe(true);

      disposeQuickJsContext(vm);
    });

    it('disposes nested tracked handles without throwing', () => {
      const vm = module.newContext();
      const disposeTracked = trackQuickJsContext(vm);

      const child = vm.newObject();
      const parent = vm.newObject();
      vm.setProp(parent, 'child', child);

      expect(parent.alive).toBe(true);
      expect(child.alive).toBe(true);

      expect(() => disposeTracked()).not.toThrow();

      expect(parent.alive).toBe(false);
      expect(child.alive).toBe(false);

      disposeQuickJsContext(vm);
    });

    it('can be called more than once safely', () => {
      const vm = module.newContext();
      const disposeTracked = trackQuickJsContext(vm);
      const handle = vm.newObject();

      disposeTracked();
      expect(handle.alive).toBe(false);

      expect(() => disposeTracked()).not.toThrow();
      expect(handle.alive).toBe(false);

      disposeQuickJsContext(vm);
    });
  });

  describe('disposeQuickJsContext', () => {
    it('disposes tracked handles before disposing the context', () => {
      const vm = module.newContext();
      const disposeTracked = trackQuickJsContext(vm);
      const handle = vm.newArray();

      disposeQuickJsContext(vm, disposeTracked);

      expect(handle.alive).toBe(false);
      expect(vm.alive).toBe(false);
    });

    it('is a no-op when the context is already disposed', () => {
      const vm = module.newContext();
      const disposeTracked = trackQuickJsContext(vm);
      const handle = vm.newObject();

      disposeQuickJsContext(vm, disposeTracked);

      expect(handle.alive).toBe(false);
      expect(vm.alive).toBe(false);
      expect(() => disposeQuickJsContext(vm, disposeTracked)).not.toThrow();
    });
  });

  describe('createManagedQuickJsContext', () => {
    it('clears tracked handles when dispose is called', () => {
      const managed = createManagedQuickJsContext(module);
      const { vm } = managed;

      const objectHandle = vm.newObject();
      const functionHandle = vm.newFunction('shimFn', () => vm.true);

      expect(objectHandle.alive).toBe(true);
      expect(functionHandle.alive).toBe(true);

      managed.dispose();

      expect(objectHandle.alive).toBe(false);
      expect(functionHandle.alive).toBe(false);
      expect(vm.alive).toBe(false);
    });

    it('auto-disposes evalCode results while keeping the context alive', () => {
      const managed = createManagedQuickJsContext(module);
      const { vm } = managed;

      expect(() => {
        vm.evalCode('1 + 1');
      }).not.toThrow();
      expect(vm.alive).toBe(true);

      managed.dispose();
      expect(vm.alive).toBe(false);
    });

    it('exposes evalCodeRetained for callers that manage result handles themselves', () => {
      const managed = createManagedQuickJsContext(module);
      const { vm } = managed;

      const result = vm.evalCodeRetained('42');
      const valueHandle = vm.unwrapResult(result);
      const value = vm.dump(valueHandle);

      expect(value).toBe(42);
      expect(valueHandle.alive).toBe(true);

      valueHandle.dispose();
      expect(valueHandle.alive).toBe(false);

      managed.dispose();
      expect(vm.alive).toBe(false);
    });
  });
});

describe('QuickJS VM handle lifecycle', () => {
  let executeQuickJsVm;
  let executeQuickJsVmAsync;
  let loader;
  let createManagedQuickJsContextSpy;
  let lastManaged;
  let lastHandles;

  const makeBru = () =>
    new Bru({
      runtime: 'quickjs',
      envVariables: {},
      runtimeVariables: {},
      processEnvVars: {},
      collectionPath: '/',
      collectionName: 'Test'
    });

  const assertHandlesWereCleared = () => {
    expect(lastHandles.length).toBeGreaterThan(0);
    lastHandles.forEach((handle) => expect(handle.alive).toBe(false));
    expect(lastManaged.vm.alive).toBe(false);
  };

  beforeAll(async () => {
    jest.resetModules();

    const utils = require('../src/sandbox/quickjs/utils');
    const createManaged = utils.createManagedQuickJsContext;

    createManagedQuickJsContextSpy = jest
      .spyOn(utils, 'createManagedQuickJsContext')
      .mockImplementation((moduleArg) => {
        lastHandles = [];
        lastManaged = createManaged(moduleArg);
        const { vm } = lastManaged;

        ['newObject', 'newArray', 'newFunction'].forEach((method) => {
          const allocate = vm[method];
          vm[method] = (...args) => {
            const handle = allocate(...args);
            lastHandles.push(handle);
            return handle;
          };
        });

        return lastManaged;
      });

    ({ executeQuickJsVm, executeQuickJsVmAsync, loader } = require('../src/sandbox/quickjs'));
    await loader();
  });

  afterAll(() => {
    createManagedQuickJsContextSpy.mockRestore();
    jest.resetModules();
  });

  beforeEach(() => {
    lastManaged = null;
    lastHandles = [];
    createManagedQuickJsContextSpy.mockClear();
  });

  describe('executeQuickJsVm', () => {
    it('clears tracked handles when execution completes', () => {
      const result = executeQuickJsVm({
        script: 'hello world',
        context: { bru: makeBru() }
      });

      expect(result).toBe('hello world');
      assertHandlesWereCleared();
    });

    it('clears tracked handles when script evaluation fails', () => {
      const result = executeQuickJsVm({
        script: 'throw new Error("sync failure")',
        context: { bru: makeBru() },
        scriptType: 'expression'
      });

      expect(result).toMatchObject({ message: 'sync failure' });
      assertHandlesWereCleared();
    });

    it('does not create a managed context for literal early returns', () => {
      expect(executeQuickJsVm({ script: '42', context: {} })).toBe(42);
      expect(executeQuickJsVm({ script: 'true', context: {} })).toBe(true);
      expect(createManagedQuickJsContextSpy).not.toHaveBeenCalled();
    });

    it('clears tracked handles on every invocation', () => {
      for (let i = 0; i < 25; i++) {
        executeQuickJsVm({
          script: `\`value-${i}\``,
          context: { bru: makeBru() },
          scriptType: 'expression'
        });

        assertHandlesWereCleared();
      }
      expect(createManagedQuickJsContextSpy).toHaveBeenCalledTimes(25);
    });
  });

  describe('executeQuickJsVmAsync', () => {
    it('clears tracked handles when async execution completes', async () => {
      await executeQuickJsVmAsync({
        script: 'console.log(bru.getCollectionName());',
        context: { bru: makeBru(), console: jest.fn() },
        collectionPath: '/tmp/collection'
      });

      assertHandlesWereCleared();
    });

    it('clears tracked handles when async script execution fails', async () => {
      await expect(
        executeQuickJsVmAsync({
          script: 'throw new Error("async failure");',
          context: { bru: makeBru() },
          collectionPath: '/tmp/collection'
        })
      ).rejects.toMatchObject({
        message: 'async failure',
        __isQuickJS: true
      });

      assertHandlesWereCleared();
    });

    it('does not create a managed context for empty scripts', async () => {
      await expect(executeQuickJsVmAsync({ script: '', context: {} })).resolves.toBe('');
      expect(createManagedQuickJsContextSpy).not.toHaveBeenCalled();
    });

    it('clears tracked handles on every async invocation', async () => {
      const consoleFn = jest.fn();

      for (let i = 0; i < 10; i++) {
        await executeQuickJsVmAsync({
          script: `console.log('run-${i}');`,
          context: { bru: makeBru(), console: consoleFn },
          collectionPath: '/tmp/collection'
        });

        assertHandlesWereCleared();
      }

      expect(createManagedQuickJsContextSpy).toHaveBeenCalledTimes(10);
    });
  });
});
