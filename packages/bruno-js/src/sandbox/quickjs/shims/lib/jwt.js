const jwt = require('jsonwebtoken');
const { marshallToVm } = require('../../utils');

const addJwtShimToContext = async (vm) => {
  // JWT sign function
  let _jwtSign = vm.newFunction('sign', function (payload, secret, options) {
    const nativePayload = vm.dump(payload);
    const nativeSecret = vm.dump(secret);
    const nativeOptions = options ? vm.dump(options) : undefined;
    
    try {
      const token = jwt.sign(nativePayload, nativeSecret, nativeOptions);
      return marshallToVm(token, vm);
    } catch (error) {
      throw vm.newError(error.message);
    }
  });
  vm.setProp(vm.global, '__bruno__jwt__sign', _jwtSign);
  _jwtSign.dispose();

  // JWT verify function
  let _jwtVerify = vm.newFunction('verify', function (token, secret, options) {
    const nativeToken = vm.dump(token);
    const nativeSecret = vm.dump(secret);
    const nativeOptions = options ? vm.dump(options) : undefined;
    
    try {
      const decoded = jwt.verify(nativeToken, nativeSecret, nativeOptions);
      return marshallToVm(decoded, vm);
    } catch (error) {
      throw vm.newError(error.message);
    }
  });
  vm.setProp(vm.global, '__bruno__jwt__verify', _jwtVerify);
  _jwtVerify.dispose();

  // JWT decode function
  let _jwtDecode = vm.newFunction('decode', function (token, options) {
    const nativeToken = vm.dump(token);
    const nativeOptions = options ? vm.dump(options) : undefined;
    
    try {
      const decoded = jwt.decode(nativeToken, nativeOptions);
      return marshallToVm(decoded, vm);
    } catch (error) {
      throw vm.newError(error.message);
    }
  });
  vm.setProp(vm.global, '__bruno__jwt__decode', _jwtDecode);
  _jwtDecode.dispose();

  vm.evalCode(
    `
        globalThis.jwt = {};
        globalThis.jwt.sign = globalThis.__bruno__jwt__sign;
        globalThis.jwt.verify = globalThis.__bruno__jwt__verify;
        globalThis.jwt.decode = globalThis.__bruno__jwt__decode;
        globalThis.requireObject = {
            ...globalThis.requireObject,
            'jsonwebtoken': globalThis.jwt,
        }
    `
  );
};

module.exports = addJwtShimToContext;
