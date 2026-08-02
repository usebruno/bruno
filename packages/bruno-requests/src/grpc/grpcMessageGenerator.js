import { faker } from '@faker-js/faker';
import descriptorExt from 'protobufjs/ext/descriptor';

/**
 * Builds an index of fully-qualified type name -> descriptor (messages and
 * enums) from the serialized FileDescriptorProtos that @grpc/proto-loader
 * attaches to every method definition (`requestType.fileDescriptorProtos`).
 *
 * proto-loader's DescriptorProto JSON references field types by `typeName`
 * only (it never inlines a resolved `messageType`), so without this index
 * message-typed fields can never be expanded.
 *
 * Files are decoded independently on purpose: building a full protobufjs Root
 * from the descriptor set can fail on valid descriptors (e.g. proto3 optional
 * synthetic oneofs, custom options), while per-file decoding only needs
 * descriptor.proto itself.
 */
const buildTypeIndex = (fileDescriptorProtos) => {
  const index = new Map();
  if (!Array.isArray(fileDescriptorProtos)) {
    return index;
  }

  const toObjectOptions = { enums: String, longs: String, defaults: true, oneofs: true };

  const indexEnum = (prefix, enumType) => {
    index.set(prefix ? `${prefix}.${enumType.name}` : enumType.name, { kind: 'enum', descriptor: enumType });
  };

  const indexMessage = (prefix, message) => {
    const fqn = prefix ? `${prefix}.${message.name}` : message.name;
    index.set(fqn, { kind: 'message', descriptor: message });
    (message.nestedType || []).forEach((nested) => indexMessage(fqn, nested));
    (message.enumType || []).forEach((enumType) => indexEnum(fqn, enumType));
  };

  for (let raw of fileDescriptorProtos) {
    try {
      if (typeof raw === 'string') {
        raw = Buffer.from(raw, 'base64');
      } else if (raw && !(raw instanceof Uint8Array)) {
        // Method definitions that crossed IPC or were rehydrated from
        // persisted collection state carry JSON-serialized Buffers
        // ({ type: 'Buffer', data: [...] }) or plain number arrays.
        const data = Array.isArray(raw) ? raw : raw.data;
        if (!Array.isArray(data)) {
          continue;
        }
        raw = Buffer.from(data);
      }
      const fd = descriptorExt.FileDescriptorProto.toObject(
        descriptorExt.FileDescriptorProto.decode(raw),
        toObjectOptions
      );
      (fd.messageType || []).forEach((message) => indexMessage(fd.package || '', message));
      (fd.enumType || []).forEach((enumType) => indexEnum(fd.package || '', enumType));
    } catch (error) {
      // A file we cannot decode only means its types stay unexpanded.
      console.error('Error decoding file descriptor for sample generation:', error);
    }
  }
  return index;
};

/**
 * Resolves a descriptor `typeName` (with or without the leading dot) against
 * the type index.
 */
const resolveTypeName = (typeName, typeIndex) => {
  if (!typeName || !typeIndex) {
    return undefined;
  }
  const name = typeName.startsWith('.') ? typeName.slice(1) : typeName;

  // Reflection mode hands out fully-qualified type names; an exact match wins.
  const exact = typeIndex.get(name);
  if (exact) {
    return exact;
  }

  // Proto-file mode hands out names relative to the requesting message's
  // package (e.g. "Book" instead of "library.v1.Book"): fall back to a suffix
  // match, but only when it is unambiguous.
  let match;
  for (const [fqn, entry] of typeIndex) {
    if (fqn === name || fqn.endsWith(`.${name}`)) {
      if (match) {
        return undefined;
      }
      match = entry;
    }
  }
  return match;
};

/**
 * Generates a sample message based on method parameter fields
 * @param {Object} fields - Method parameter fields
 * @param {Object} options - Generation options
 * @param {Map} typeIndex - Fully-qualified type name -> descriptor index
 * @param {Set} ancestors - Type names already being expanded (cycle guard)
 * @returns {Object} Generated message
 */
const generateSampleMessageFromFields = (fields, options = {}, typeIndex = undefined, ancestors = new Set()) => {
  const result = {};

  if (!fields || !Array.isArray(fields)) {
    return {};
  }

  fields.forEach((field) => {
    // Generate a value based on field name and type
    if (field.type === 'TYPE_MESSAGE') {
      // Field info may be inlined (field.messageType) or, in the
      // @grpc/proto-loader descriptor shape, referenced by typeName only and
      // resolved through the index built from fileDescriptorProtos.
      let nestedFields = field.messageType && field.messageType.field;
      let isMapEntry = false;
      if (!nestedFields) {
        const resolved = resolveTypeName(field.typeName, typeIndex);
        if (resolved && resolved.kind === 'message') {
          nestedFields = resolved.descriptor.field;
          // Detect synthetic map entries structurally (repeated + exactly
          // key/value fields): the map_entry option is unreliable in the
          // descriptors proto-loader synthesizes for local proto files.
          isMapEntry
            = field.label === 'LABEL_REPEATED'
              && Array.isArray(nestedFields)
              && nestedFields.length === 2
              && nestedFields[0]
              && nestedFields[0].name === 'key'
              && nestedFields[1]
              && nestedFields[1].name === 'value';
        }
      }

      const cycleKey = field.typeName || field.name;
      if (nestedFields && !ancestors.has(cycleKey)) {
        const nextAncestors = new Set(ancestors);
        nextAncestors.add(cycleKey);
        const generateOne = () => generateSampleMessageFromFields(nestedFields, options, typeIndex, nextAncestors);

        if (isMapEntry) {
          // Maps are repeated synthetic <key, value> entry messages in the
          // descriptor but plain objects in JSON
          const entry = generateOne();
          result[field.name] = { [entry.key ?? 'key']: entry.value ?? null };
        } else if (field.label === 'LABEL_REPEATED') {
          // Generate array of nested messages
          const count = options.arraySize || faker.number.int({ min: 1, max: 3 });
          result[field.name] = Array.from({ length: count }, generateOne);
        } else {
          // Generate single nested message
          result[field.name] = generateOne();
        }
      } else {
        // Unresolvable or recursive message type: fall back to an empty object
        result[field.name] = field.label === 'LABEL_REPEATED' ? [{}] : {};
      }
    } else if (field.type === 'TYPE_ENUM') {
      // Use the first declared enum value name when the enum is resolvable
      // (matches proto-loader's `enums: String` output); fall back to 0.
      const resolved = resolveTypeName(field.typeName, typeIndex);
      const firstValue
        = resolved && resolved.kind === 'enum' && resolved.descriptor.value && resolved.descriptor.value[0]
          ? resolved.descriptor.value[0].name
          : undefined;
      const value = firstValue ?? 0;
      result[field.name] = field.label === 'LABEL_REPEATED' ? [value] : value;
    } else {
      // Generate value based on primitive type and name
      let value;

      switch (field.type) {
        case 'TYPE_DOUBLE':
        case 'TYPE_FLOAT':
          value = faker.number.float({ min: 0, max: 1000, precision: 0.01 });
          break;
        case 'TYPE_INT32':
        case 'TYPE_INT64':
        case 'TYPE_SINT32':
        case 'TYPE_SINT64':
        case 'TYPE_UINT32':
        case 'TYPE_UINT64':
        case 'TYPE_FIXED32':
        case 'TYPE_FIXED64':
          value = faker.number.int({ min: 0, max: 1000 });
          break;
        case 'TYPE_BOOL':
          value = faker.datatype.boolean();
          break;
        case 'TYPE_STRING':
          value = faker.lorem.word();
          break;
        case 'TYPE_BYTES':
          value = Buffer.from(faker.string.alpha({ length: { min: 5, max: 10 } })).toString('base64');
          break;
        default:
          value = faker.lorem.word();
      }

      if (field.label === 'LABEL_REPEATED') {
        // Generate array of values
        const count = options.arraySize || faker.number.int({ min: 1, max: 3 });
        result[field.name] = Array.from({ length: count }, () => value);
      } else {
        result[field.name] = value;
      }
    }
  });

  return result;
};

/**
 * Extracts field definitions from a method's request type
 * @param {Object} method - The gRPC method
 * @returns {Array|null} Array of field definitions or null
 */
const getMethodRequestFields = (method) => {
  try {
    // Navigate through various potential property paths to find fields
    if (method.requestType?.type?.field) {
      return method.requestType.type.field;
    }

    if (method.requestType?.field) {
      return method.requestType.field;
    }

    if (method.requestType?.type) {
      return method.requestType.type;
    }
  } catch (error) {
    console.error('Error extracting method request fields:', error);
    return null;
  }
};

/**
 * Generates a sample gRPC message based on a method definition
 * @param {Object} method - gRPC method definition
 * @param {Object} options - Generation options
 * @returns {Object} Generated message
 */
export const generateGrpcSampleMessage = (method, options = {}) => {
  try {
    if (!method) {
      return {};
    }

    const fields = getMethodRequestFields(method);

    if (fields) {
      const typeIndex = buildTypeIndex(method.requestType?.fileDescriptorProtos);
      return generateSampleMessageFromFields(fields, options, typeIndex);
    }

    // If method exists but no field information could be extracted,
    // generate a generic message that matches common patterns
    return {};
  } catch (error) {
    console.error('Error generating gRPC sample message:', error);
  }
};
