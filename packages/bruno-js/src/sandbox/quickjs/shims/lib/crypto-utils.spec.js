const { describe, it, expect } = require('@jest/globals');
const { newQuickJSWASMModule } = require('quickjs-emscripten');
const addCryptoUtilsShimToContext = require('./crypto-utils');
const getBundledCode = require('../../../bundle-browser-rollup');

describe('crypto-utils shims tests', () => {
  let vm, module;

  beforeAll(async () => {
    module = await newQuickJSWASMModule();
  });

  beforeEach(async () => {
    vm = module.newContext();
    await addCryptoUtilsShimToContext(vm);
    // required for `Buffer` library usage
    const bundledCode = getBundledCode?.toString() || '';
    vm.evalCode(
      `
        (${bundledCode})()
      `
    );
  });

  it('should provide crypto.randomBytes function', async () => {
    const result = vm.evalCode('typeof crypto.randomBytes');
    const handle = vm.unwrapResult(result);
    const type = vm.dump(handle);
    handle.dispose();
  
    expect(type).toBe('function');
  });

  it('should provide crypto.getRandomValues function', async () => {
    const result = vm.evalCode('typeof crypto.getRandomValues');
    const handle = vm.unwrapResult(result);
    const type = vm.dump(handle);
    handle.dispose();
    
    expect(type).toBe('function');
  });

  it('should generate random bytes with correct length', async () => {
    const result = vm.evalCode('crypto.randomBytes(8).length');
    const handle = vm.unwrapResult(result);
    const length = vm.dump(handle);
    handle.dispose();
    
    expect(length).toBe(8);
  });

  it('should convert random bytes to hex string', async () => {
    const result = vm.evalCode('crypto.randomBytes(4).toString("hex").length');
    const handle = vm.unwrapResult(result);
    const hexLength = vm.dump(handle);
    handle.dispose();
    
    expect(hexLength).toBe(8); // 4 bytes = 8 hex chars
  });

  it('should fill Uint8Array with getRandomValues', async () => {
    const result = vm.evalCode(`
      const arr = new Uint8Array(5);
      crypto.getRandomValues(arr);
      arr.length;
    `);
    const handle = vm.unwrapResult(result);
    const length = vm.dump(handle);
    handle.dispose();
    
    expect(length).toBe(5);
  });
});