const isUint8Array = (val) => {
  try {
    // developer mode [node:vm]
    const util = require('node:util');
    return util.types.isUint8Array(val);
  }
  catch (err) {
    // node:util not present in safe mode [quickjs]
    return val instanceof Uint8Array;
  }
}

const getRandomValuesFunction = (typedArray) => {
  try {
    // developer mode [node:vm]
    const crypto = require('node:crypto');
    return crypto.getRandomValues(typedArray);
  }
  catch (err) {
    // node:crypto not present in safe mode [quickjs] - uses shim
    return crypto.getRandomValues(typedArray);
  }
}

const randomBytesFunction = (num) => {
  try {
    // developer mode [node:vm]
    const crypto = require('node:crypto');
    return crypto.randomBytes(num);
  }
  catch (err) {
    // node:crypto not present in safe mode [quickjs] - uses shim
    return crypto.randomBytes(num);
  }
}


module.exports = {
  isUint8Array,
  getRandomValuesFunction,
  randomBytesFunction
}