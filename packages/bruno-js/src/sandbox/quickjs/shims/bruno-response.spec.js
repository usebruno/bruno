const { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addBrunoResponseShimToContext = require('./bruno-response');

describe('bruno response shim', () => {
  let vm, module;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(() => {
    vm = module.newContext();
  });

  afterEach(() => {
    if (vm) {
      try {
        vm.dispose();
      } catch (err) {
        console.error('Error disposing vm', err);
      }
      vm = null;
    }
  });

  afterAll(() => {
    if (module) {
      try {
        module.dispose();
      } catch (err) {
        console.error('Error disposing module', err);
      }
      module = null;
    }
  });

  it('forwards response query filter callbacks in safe mode', () => {
    const resources = [
      { id: 'test', value: 1 },
      { id: 'other', value: 2 }
    ];
    const response = Object.assign(
      (expr, filter) => {
        expect(expr).toBe('resources[?].id');
        return resources.filter(filter).map((item) => item.id);
      },
      { status: 200, statusText: 'OK', headers: {}, body: { resources } }
    );

    addBrunoResponseShimToContext(vm, response);

    const result = vm.evalCode(`
      res('resources[?].id', r => r.id === 'test')
    `);

    const valueHandle = vm.unwrapResult(result);
    const filtered = vm.dump(valueHandle);
    valueHandle.dispose();

    expect(filtered).toEqual(['test']);
  });

  it('still supports object predicates in safe mode', () => {
    const resources = [
      { id: 'test', value: 1 },
      { id: 'other', value: 2 }
    ];
    const response = Object.assign(
      (expr, predicate) => {
        expect(expr).toBe('resources[?].id');
        return resources.filter((item) =>
          Object.entries(predicate).every(([key, value]) => item[key] === value)
        ).map((item) => item.id);
      },
      { status: 200, statusText: 'OK', headers: {}, body: { resources } }
    );

    addBrunoResponseShimToContext(vm, response);

    const result = vm.evalCode(`
      res('resources[?].id', { id: 'other' })
    `);

    const valueHandle = vm.unwrapResult(result);
    const filtered = vm.dump(valueHandle);
    valueHandle.dispose();

    expect(filtered).toEqual(['other']);
  });
});
