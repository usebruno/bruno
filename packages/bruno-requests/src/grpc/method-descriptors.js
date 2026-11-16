import * as protoLoader from '@grpc/proto-loader';

/**
 * Proto descriptors are the only part of a method definition that can outlive the process that
 * loaded it: the serializers around them are functions. This module splits the two apart and
 * rebuilds the serializers from what was kept.
 */

/**
 * FileDescriptorSet carries its files in field 1, so a bare FileDescriptorProto only needs that
 * tag and its length in front of it to become a set proto-loader will accept.
 */
const FILE_DESCRIPTOR_SET_FILE_TAG = 0x0a;

const encodeVarint = (value) => {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining) byte |= 0x80;
    bytes.push(byte);
  } while (remaining);
  return Buffer.from(bytes);
};

const toFileDescriptorSet = (descriptors) => {
  const parts = [];
  for (const descriptor of descriptors) {
    const file = Buffer.from(descriptor, 'base64');
    parts.push(Buffer.from([FILE_DESCRIPTOR_SET_FILE_TAG]), encodeVarint(file.length), file);
  }
  return Buffer.concat(parts);
};

/** A descriptor survives JSON as an array-like object, so take its bytes in whatever shape. */
const toDescriptorBuffer = (proto) => {
  if (Buffer.isBuffer(proto) || proto instanceof Uint8Array || Array.isArray(proto)) {
    return Buffer.from(proto);
  }
  return Buffer.from(Object.values(proto));
};

const takeDescriptors = (messageType, collected) => {
  if (!messageType) return messageType;
  const { fileDescriptorProtos, ...rest } = messageType;
  for (const proto of fileDescriptorProtos ?? []) {
    collected.add(toDescriptorBuffer(proto).toString('base64'));
  }
  return rest;
};

/**
 * Splits loaded methods into the metadata a renderer can use and the proto descriptors it cannot.
 * Every method of a service repeats the same descriptors, hence the dedupe.
 * @param {Array} methods
 * @returns {{ methods: Array, descriptors: string[] }} descriptors are base64 FileDescriptorProtos
 */
export const splitMethodDescriptors = (methods = []) => {
  const collected = new Set();
  const withoutDescriptors = methods.map((method) => ({
    ...method,
    requestType: takeDescriptors(method.requestType, collected),
    responseType: takeDescriptors(method.responseType, collected)
  }));

  return { methods: withoutDescriptors, descriptors: [...collected] };
};

/**
 * Rebuilds a package definition — serializers included — from descriptors kept by an earlier load.
 * @param {string[]} descriptors - base64 FileDescriptorProtos, as split out by splitMethodDescriptors
 * @param {import('@grpc/proto-loader').Options} options
 * @returns {import('@grpc/proto-loader').PackageDefinition}
 */
export const loadPackageDefinitionFromDescriptors = (descriptors, options) => {
  return protoLoader.loadFileDescriptorSetFromBuffer(toFileDescriptorSet(descriptors), options);
};
