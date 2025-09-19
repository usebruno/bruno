const jwt = require('jsonwebtoken');
const { marshallToVm, invokeFunction } = require('../../utils');

const addJwtShimToContext = async (vm) => {
  // --- sign ---
  const _jwtSign = vm.newFunction('sign', function (payload, secret, options, callback) {
    const nativePayload = vm.dump(payload);
    const nativeSecret = vm.dump(secret);

    let nativeOptions;
    let callbackHandle = callback;
    const optionsType = options === undefined ? 'undefined' : vm.typeof(options);
    if (optionsType === 'function') {
      callbackHandle = options;
      nativeOptions = undefined;
    } else if (optionsType === 'object' && options !== null) {
      nativeOptions = vm.dump(options);
    }

    // If a callback is provided
    if (callbackHandle && vm.typeof(callbackHandle) === 'function') {

      let tokenResult;
      let hostError;
      try {
        tokenResult = nativeOptions
          ? jwt.sign(nativePayload, nativeSecret, nativeOptions)
          : jwt.sign(nativePayload, nativeSecret);
      } catch (err) {
        hostError = err;
      }

      try {
        if (hostError) {
          const errVm = vm.newError(hostError.message || String(hostError));
          invokeFunction(vm, callbackHandle, [errVm, vm.undefined])
            .catch((e) => {
              console.warn('[JWT SHIM][sign.cb] callback invocation error:', e);
            })
            .finally(() => {
              errVm.dispose();
              callbackHandle.dispose();
            });
        } else {
          const tokenVm = marshallToVm(String(tokenResult), vm);
          invokeFunction(vm, callbackHandle, [vm.null, tokenVm])
            .catch((e) => {
              console.warn('[JWT SHIM][sign.cb] callback invocation error:', e);
            })
            .finally(() => {
              tokenVm.dispose();
              callbackHandle.dispose();
            });
        }
      } catch (e) {
        console.warn('[JWT SHIM][sign.cb] unexpected error:', e);
        callbackHandle.dispose();
      }

      return vm.undefined;
    }

    try {
      const token = nativeOptions
        ? jwt.sign(nativePayload, nativeSecret, nativeOptions)
        : jwt.sign(nativePayload, nativeSecret);
      return marshallToVm(token, vm);
    } catch (err) {
      throw vm.newError(err.message || String(err));
    }
  });

  vm.setProp(vm.global, '__bruno__jwt__sign', _jwtSign);
  _jwtSign.dispose();

  // --- verify ---
  const _jwtVerify = vm.newFunction('verify', function (token, secret, options, callback) {
    const nativeToken = vm.dump(token);
    const nativeSecret = vm.dump(secret);

    let nativeOptions;
    let actualCallback = callback;

    const optionsType = options === undefined ? 'undefined' : vm.typeof(options);
    if (optionsType === 'function') {
      actualCallback = options;
      nativeOptions = undefined;
    } else if (optionsType === 'object' && options !== null) {
      nativeOptions = vm.dump(options);
    }

    if (actualCallback && vm.typeof(actualCallback) === 'function') {

      let decodedResult;
      let hostError;
      try {
        decodedResult = nativeOptions
          ? jwt.verify(nativeToken, nativeSecret, nativeOptions)
          : jwt.verify(nativeToken, nativeSecret);
      } catch (err) {
        hostError = err;
      }

      try {
        if (hostError) {
          const vmErr = vm.newError(hostError.message || String(hostError));
          invokeFunction(vm, actualCallback, [vmErr, vm.undefined])
            .catch((e) => {
              console.warn('[JWT SHIM][verify.cb] callback invocation error:', e);
            })
            .finally(() => {
              vmErr.dispose();
              actualCallback.dispose();
            });
        } else {
          const vmNull = vm.null;
          const vmDecoded = marshallToVm(decodedResult, vm);
          invokeFunction(vm, actualCallback, [vmNull, vmDecoded])
            .catch((e) => {
              console.warn('[JWT SHIM][verify.cb] callback invocation error:', e);
            })
            .finally(() => {
              vmDecoded.dispose();
              actualCallback.dispose();
            });
        }
      } catch (e) {
        console.warn('[JWT SHIM][verify.cb] unexpected error:', e);
        actualCallback.dispose();
      }

      return vm.undefined;
    }

    try {
      const decoded = nativeOptions
        ? jwt.verify(nativeToken, nativeSecret, nativeOptions)
        : jwt.verify(nativeToken, nativeSecret);
      return marshallToVm(decoded, vm);
    } catch (err) {
      throw vm.newError(err.message || String(err));
    }
  });

  vm.setProp(vm.global, '__bruno__jwt__verify', _jwtVerify);
  _jwtVerify.dispose();

  // --- decode ---
  const _jwtDecode = vm.newFunction('decode', function (token, options) {
    const nativeToken = vm.dump(token);

    let nativeOptions;
    const optionsType = options === undefined ? 'undefined' : vm.typeof(options);
    if (optionsType === 'object' && options !== null) {
      nativeOptions = vm.dump(options);
    }

    try {
      const decoded = nativeOptions
        ? jwt.decode(nativeToken, nativeOptions)
        : jwt.decode(nativeToken);
      return marshallToVm(decoded, vm);
    } catch (err) {
      throw vm.newError(err.message || String(err));
    }
  });

  vm.setProp(vm.global, '__bruno__jwt__decode', _jwtDecode);
  _jwtDecode.dispose();

  vm.evalCode(`
    globalThis.jwt = {};
    globalThis.jwt.sign = globalThis.__bruno__jwt__sign;
    globalThis.jwt.verify = globalThis.__bruno__jwt__verify;
    globalThis.jwt.decode = globalThis.__bruno__jwt__decode;
    globalThis.requireObject = {
      ...globalThis.requireObject,
      'jsonwebtoken': globalThis.jwt,
    };
  `);
};

module.exports = addJwtShimToContext;
