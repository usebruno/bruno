const crypto = require('node:crypto');
const { marshallToVm } = require('../../utils');
const { serializeTypedArray, deserializeTypedArray } = require('./utils');

/**
 * Node.js crypto module shim for QuickJS sandbox
 * Implements crypto.randomBytes and crypto.getRandomValues functions
 */
const addCryptoUtilsShimToContext = async (vm) => {
  let randomBytesHandle = vm.newFunction('randomBytes', function (sizeHandle) {
    try {
      let size = vm.dump(sizeHandle);
      
      if (typeof size !== 'number') {
        throw new TypeError('The "size" argument must be of type number');
      }

      size = Math.trunc(size);

      if (size < 0) {
        throw new RangeError('The "size" argument must be >= 0');
      }

      if (size > 65536) { // 2^31 - 1 (max safe integer for practical use)
        throw new RangeError('The "size" argument is too large');
      }

      if (size === 0) {
        return marshallToVm([], vm);
      }

      const buffer = crypto.randomBytes(size);
      
      const byteArray = Array.from(buffer);
      
      return marshallToVm(byteArray, vm);
      
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));
      
      throw vmError;
    }
  });

  let getRandomValuesHandle = vm.newFunction('getRandomValues', function (arrayHandle) {
    try {
      // Receive the serialized array data directly
      const serializedArray = vm.dump(arrayHandle);
      const typedArray = deserializeTypedArray(serializedArray);
      
      if (typedArray.length === 0) {
        return marshallToVm([], vm);
      }

      if (typedArray.length > 65536) {
        throw new Error('getRandomValues: ArrayBufferView byte length exceeds 65536');
      }

      crypto.getRandomValues(typedArray);

      const byteArray = Array.from(typedArray);

      return marshallToVm(byteArray, vm);
      
    } catch (error) {
      const vmError = vm.newError(error.message);
      vm.setProp(vmError, 'name', vm.newString(error.name));
      
      throw vmError;
    }
  });

  // Set the functions in global context
  vm.setProp(vm.global, '__bruno__crypto__randomBytes', randomBytesHandle);
  vm.setProp(vm.global, '__bruno__crypto__getRandomValues', getRandomValuesHandle);
  randomBytesHandle.dispose();
  getRandomValuesHandle.dispose();

  vm.evalCode(`
    // Helper function for typed array serialization
    ${serializeTypedArray.toString()}
    
    // Create crypto module object following Node.js specifications
    const cryptoModule = {
      // node.js crypto.randomBytes API
      randomBytes: function(size) {
        const byteArray = globalThis.__bruno__crypto__randomBytes(size);
        return Buffer.from(Array.from(byteArray));
      },
      // node.js crypto.getRandomValues API
      getRandomValues: function(typedArray) {
        const serializedTypedArray = serializeTypedArray(typedArray);
        typedArray.set(globalThis.__bruno__crypto__getRandomValues(serializedTypedArray));
        return typedArray;
      },
    };
    
    // Make crypto available globally
    globalThis.crypto = cryptoModule;
  `);
};

module.exports = addCryptoUtilsShimToContext;