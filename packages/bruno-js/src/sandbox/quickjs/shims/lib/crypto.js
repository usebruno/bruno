const cryptoJS = require('crypto-js');
const { marshallToVm } = require('../../utils');

const createAndSetProp = (vm, object, name, method) => {
  const handle = vm.newFunction(name, (...args) => {
    const nativeArgs = args.map(vm.dump);
    return marshallToVm(method(...nativeArgs), vm);
  });
  vm.setProp(object, name, handle);
  handle.dispose();
};

const fns = [
  // hashing
  'MD5',
  'SHA1',
  'SHA256',
  'SHA512',
  'SHA3',
  'RIPEMD160',
  // hmac
  'HmacMD5',
  'HmacSHA1',
  'HmacSHA256',
  'HmacSHA512',
  // PBKDF2
  'PBKDF2'
];

const addCryptoJSShimToContext = async (vm) => {
  const cryptoJSObject = vm.newObject();

  fns.forEach((fn) => {
    let fnHandle = vm.newFunction(fn, function (...args) {
      const nativeArgs = args.map(vm.dump);
      console.log('crypto', fn, nativeArgs);
      let v = cryptoJS[fn](...nativeArgs);
      console.log('crypto', typeof v, Object.keys(v));
      return marshallToVm(cryptoJS[fn](...nativeArgs), vm);
    });
    vm.setProp(cryptoJSObject, fn, fnHandle);
    fnHandle.dispose();
  });

  const aesCryptoJSObject = vm.newObject();

  createAndSetProp(vm, aesCryptoJSObject, 'encrypt', cryptoJS.AES.encrypt);
  createAndSetProp(vm, aesCryptoJSObject, 'decrypt', cryptoJS.AES.decrypt);

  vm.setProp(cryptoJSObject, 'AES', aesCryptoJSObject);
  aesCryptoJSObject.dispose();

  const desCryptoJSObject = vm.newObject();

  createAndSetProp(vm, desCryptoJSObject, 'encrypt', cryptoJS.DES.encrypt);
  createAndSetProp(vm, desCryptoJSObject, 'decrypt', cryptoJS.DES.decrypt);

  vm.setProp(cryptoJSObject, 'DES', desCryptoJSObject);
  desCryptoJSObject.dispose();

  const tripleDesCryptoJSObject = vm.newObject();

  createAndSetProp(vm, tripleDesCryptoJSObject, 'encrypt', cryptoJS.TripleDES.encrypt);
  createAndSetProp(vm, tripleDesCryptoJSObject, 'decrypt', cryptoJS.TripleDES.decrypt);

  vm.setProp(cryptoJSObject, 'TripleDES', tripleDesCryptoJSObject);
  tripleDesCryptoJSObject.dispose();

  const rabbitCryptoJSObject = vm.newObject();

  createAndSetProp(vm, rabbitCryptoJSObject, 'encrypt', cryptoJS.Rabbit.encrypt);
  createAndSetProp(vm, rabbitCryptoJSObject, 'decrypt', cryptoJS.Rabbit.decrypt);

  vm.setProp(cryptoJSObject, 'Rabbit', rabbitCryptoJSObject);
  rabbitCryptoJSObject.dispose();

  const rc4CryptoJSObject = vm.newObject();

  createAndSetProp(vm, rc4CryptoJSObject, 'encrypt', cryptoJS.RC4.encrypt);
  createAndSetProp(vm, rc4CryptoJSObject, 'decrypt', cryptoJS.RC4.decrypt);

  vm.setProp(cryptoJSObject, 'RC4', rc4CryptoJSObject);
  rc4CryptoJSObject.dispose();

  const rc4DropCryptoJSObject = vm.newObject();

  createAndSetProp(vm, rc4DropCryptoJSObject, 'encrypt', cryptoJS.RC4Drop.encrypt);
  createAndSetProp(vm, rc4DropCryptoJSObject, 'decrypt', cryptoJS.RC4Drop.decrypt);

  vm.setProp(cryptoJSObject, 'RC4Drop', rc4DropCryptoJSObject);
  rc4DropCryptoJSObject.dispose();

  const encCryptoJSObject = vm.newObject();

  const base64EncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, base64EncCryptoJSObject, 'parse', cryptoJS.enc.Base64.parse);
  createAndSetProp(vm, base64EncCryptoJSObject, 'stringify', cryptoJS.enc.Base64.stringify);

  vm.setProp(encCryptoJSObject, 'Base64', base64EncCryptoJSObject);
  base64EncCryptoJSObject.dispose();

  const Latin1EncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, Latin1EncCryptoJSObject, 'parse', cryptoJS.enc.Latin1.parse);
  createAndSetProp(vm, Latin1EncCryptoJSObject, 'stringify', cryptoJS.enc.Latin1.stringify);

  vm.setProp(encCryptoJSObject, 'Latin1', Latin1EncCryptoJSObject);
  Latin1EncCryptoJSObject.dispose();

  const hexEncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, hexEncCryptoJSObject, 'parse', cryptoJS.enc.Hex.parse);
  createAndSetProp(vm, hexEncCryptoJSObject, 'stringify', cryptoJS.enc.Hex.stringify);

  vm.setProp(encCryptoJSObject, 'Hex', hexEncCryptoJSObject);
  hexEncCryptoJSObject.dispose();

  const utf8EncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, utf8EncCryptoJSObject, 'parse', cryptoJS.enc.Utf8.parse);
  createAndSetProp(vm, utf8EncCryptoJSObject, 'stringify', cryptoJS.enc.Utf8.stringify);

  vm.setProp(encCryptoJSObject, 'Utf8', utf8EncCryptoJSObject);
  utf8EncCryptoJSObject.dispose();

  const utf16EncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, utf16EncCryptoJSObject, 'parse', cryptoJS.enc.Utf16.parse);
  createAndSetProp(vm, utf16EncCryptoJSObject, 'stringify', cryptoJS.enc.Utf16.stringify);

  vm.setProp(encCryptoJSObject, 'Utf16', utf16EncCryptoJSObject);
  utf16EncCryptoJSObject.dispose();

  const utf16LEEncCryptoJSObject = vm.newObject();

  createAndSetProp(vm, utf16LEEncCryptoJSObject, 'parse', cryptoJS.enc.Utf16LE.parse);
  createAndSetProp(vm, utf16LEEncCryptoJSObject, 'stringify', cryptoJS.enc.Utf16LE.stringify);

  vm.setProp(encCryptoJSObject, 'Utf16LE', utf16LEEncCryptoJSObject);
  utf16LEEncCryptoJSObject.dispose();

  vm.setProp(cryptoJSObject, 'enc', encCryptoJSObject);
  encCryptoJSObject.dispose();

  vm.setProp(vm.global, '__bruno_cryptoJS', cryptoJSObject);
  cryptoJSObject.dispose();

  vm.evalCode(
    `
        globalThis.requireObject = {
            ...(globalThis.requireObject || {}),
            'crypto-js': __bruno_cryptoJS,
        }
    `
  );
};

module.exports = addCryptoJSShimToContext;
