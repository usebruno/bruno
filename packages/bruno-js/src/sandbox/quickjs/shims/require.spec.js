const { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const { addRequireShimToContext, getRequireCode } = require('./require');
const { createEvalHelper } = require('../utils');

describe('require shim tests', () => {
  let vm, module, evalAndDump;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = module.newContext();
    evalAndDump = createEvalHelper(vm);
    // Initialize empty requireObject
    vm.evalCode('globalThis.requireObject = {}');
  });

  afterEach(() => {
    if (vm) {
      try {
        vm.dispose();
      } catch (err) {
        // Ignore disposal errors
      }
      vm = null;
    }
  });

  afterAll(() => {
    if (module) {
      try {
        module.dispose();
      } catch (err) {
        // Ignore disposal errors
      }
      module = null;
    }
  });

  describe('getRequireCode', () => {
    it('should return a string', () => {
      expect(typeof getRequireCode()).toBe('string');
      expect(typeof getRequireCode({ enableLocalModules: false })).toBe('string');
      expect(typeof getRequireCode({ enableLocalModules: true })).toBe('string');
    });

    it('should contain require function definition', () => {
      const code = getRequireCode();
      expect(code).toContain('globalThis.require');
      expect(code).toContain('requireObject');
    });
  });

  describe('addRequireShimToContext', () => {
    it('should add require function to the VM context', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });
      const typeOfRequire = evalAndDump('typeof globalThis.require');
      expect(typeOfRequire).toBe('function');
    });

    it('should return module from requireObject', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });

      // Register a mock module
      vm.evalCode(`
        globalThis.requireObject['test-module'] = { foo: 'bar', answer: 42 };
      `);

      const result = evalAndDump(`
        const mod = require('test-module');
        [mod.foo, mod.answer];
      `);

      expect(result).toEqual(['bar', 42]);
    });

    it('should support destructuring from required modules', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });

      vm.evalCode(`
        globalThis.requireObject['my-lib'] = {
          greet: (name) => 'Hello, ' + name,
          VERSION: '1.0.0'
        };
      `);

      const [greeting, version] = evalAndDump(`
        const { greet, VERSION } = require('my-lib');
        [greet('World'), VERSION];
      `);

      expect(greeting).toBe('Hello, World');
      expect(version).toBe('1.0.0');
    });

    it('should support aliased destructuring', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });

      vm.evalCode(`
        globalThis.requireObject['utils'] = { v1: () => 'version-1' };
      `);

      const result = evalAndDump(`
        const { v1: getVersion } = require('utils');
        getVersion();
      `);

      expect(result).toBe('version-1');
    });

    it('should throw error for unknown modules', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });

      const result = vm.evalCode(`
        try {
          require('non-existent-module');
          'no error';
        } catch (e) {
          e.message;
        }
      `);
      const handle = vm.unwrapResult(result);
      const errorMessage = vm.dump(handle);
      handle.dispose();

      expect(errorMessage).toContain('Cannot find module');
      expect(errorMessage).toContain('non-existent-module');
    });

    it('should allow requiring the same module multiple times', () => {
      addRequireShimToContext(vm, { enableLocalModules: false });

      vm.evalCode(`
        globalThis.requireObject['counter'] = { count: 0 };
      `);

      const result = evalAndDump(`
        const mod1 = require('counter');
        const mod2 = require('counter');
        mod1 === mod2;
      `);

      expect(result).toBe(true);
    });
  });

  describe('enableLocalModules option', () => {
    it('should include local module loading code when enabled', () => {
      const code = getRequireCode({ enableLocalModules: true });
      expect(code).toContain('isModuleAPath');
      expect(code).toContain('__brunoLoadLocalModule');
    });

    it('should not include local module loading code when disabled', () => {
      const code = getRequireCode({ enableLocalModules: false });
      expect(code).not.toContain('isModuleAPath');
      expect(code).not.toContain('__brunoLoadLocalModule');
    });
  });
});
