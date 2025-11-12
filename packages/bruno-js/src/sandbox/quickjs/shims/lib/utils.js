function serializeTypedArray(ta) {
  return {
    type: ta.constructor.name,
    array: Array.from(ta),
    length: ta.length
  };
}

function deserializeTypedArray(obj) {
  // Allowed typed array constructors for crypto operations
  const allowedConstructors = new Set([
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array'
  ]);

  if (!obj || typeof obj !== 'object') {
    throw new TypeError('getRandomValues: Invalid typed array object');
  }

  if (typeof obj.type !== 'string' || !allowedConstructors.has(obj.type)) {
    throw new TypeError(`getRandomValues: Invalid or unsupported typed array type: ${obj.type}`);
  }

  if (!obj.array || typeof obj.length !== 'number') {
    throw new TypeError('getRandomValues: Invalid typed array properties');
  }

  const ctor = globalThis[obj.type];
  if (typeof ctor !== 'function') {
    throw new TypeError(`getRandomValues: Constructor ${obj.type} is not available`);
  }

  return new ctor(obj.array, 0, obj.length);
}

module.exports = {
  serializeTypedArray,
  deserializeTypedArray
}