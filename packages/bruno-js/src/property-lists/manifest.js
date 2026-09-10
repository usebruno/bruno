const { POSITIONAL_METHODS } = require('./property-list');

/**
 * Property-list manifest — the single source of truth for every list-like scripting
 * surface. Each descriptor declares the surface's capability axes as data; both the
 * native factory (`create-property-list.js`) and the QuickJS shims (via
 * `bridgeMethodSets`) read the same descriptor, so the two runtimes cannot drift.
 *
 * Descriptor fields:
 *   path             Dotted script path (`bru.cookies`, `req.headerList`, …). Unique.
 *   ordered          Whether the backing store has a real ordering; gates the
 *                    positional mutators (insert/insertAfter/prepend/append).
 *   writable         true | false | 'wiring' — 'wiring' defers to the factory
 *                    call site (gRPC request metadata is writable only in the
 *                    beforeCallStart hook).
 *   async            Write methods use the callback-or-promise convention.
 *   caseInsensitive  Key matching for reads.
 *   uniqueKeys       Keys are unique; enables string-key `indexOf` and object-form
 *                    `has` shortcuts.
 *   writeMethods     The surface's write API, implemented verbatim by its store.
 *   serializers      `{ toString, toObject }` serializer ids (see property-list.js).
 *   errors           `{ readonly(method), unordered(method) }` message templates.
 */

const GRPC_METADATA_ERRORS = {
  readonly: (method) =>
    `metadata.${method}() is not available once the call has been sent — change metadata in the beforeCallStart hook`,
  unordered: (method) => `${method}() is not available on gRPC metadata — it is a key-value map with no ordering`
};

const GRPC_METADATA_SURFACE = {
  ordered: false,
  async: false,
  caseInsensitive: true,
  uniqueKeys: true,
  writeMethods: ['upsert', 'add', 'remove', 'clear'],
  serializers: { toString: 'metadataLines', toObject: 'basic' },
  errors: GRPC_METADATA_ERRORS
};

const PROPERTY_LIST_MANIFEST = [
  {
    path: 'bru.grpc.request.metadata',
    ...GRPC_METADATA_SURFACE,
    writable: 'wiring'
  },
  {
    path: 'bru.grpc.response.metadata',
    ...GRPC_METADATA_SURFACE,
    writable: false
  },
  {
    path: 'bru.grpc.response.trailers',
    ...GRPC_METADATA_SURFACE,
    writable: false
  }
];

const MANIFEST_BY_PATH = Object.fromEntries(PROPERTY_LIST_MANIFEST.map((d) => [d.path, Object.freeze(d)]));

const descriptorFor = (path) => MANIFEST_BY_PATH[path];

const READ_PRIMITIVE_METHODS = ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'];
const READ_OBJECT_METHODS = ['one', 'all', 'idx', 'toJSON'];

/**
 * Derive the QuickJS bridge method sets for a surface from its descriptor, so the
 * shims never hand-maintain per-surface method lists. Positional mutators are
 * registered as sync writes everywhere — natively they are capability-gated
 * throwers, and the throw propagates into the VM.
 *
 * @param {string} path - A manifest path
 * @returns {object} Options for `createPropertyListBridge` (minus vm wiring)
 */
const bridgeMethodSets = (path) => {
  const descriptor = descriptorFor(path);
  if (!descriptor) {
    throw new Error(`Unknown property list path: '${path}'. Add it to the manifest.`);
  }
  return {
    syncReadMethods: [...READ_PRIMITIVE_METHODS],
    syncReadObjectMethods: [...READ_OBJECT_METHODS],
    syncWriteMethods: descriptor.async
      ? [...POSITIONAL_METHODS]
      : [...descriptor.writeMethods, ...POSITIONAL_METHODS],
    asyncWriteMethods: descriptor.async ? [...descriptor.writeMethods] : [],
    withIterators: true
  };
};

module.exports = {
  PROPERTY_LIST_MANIFEST: Object.freeze(PROPERTY_LIST_MANIFEST),
  descriptorFor,
  bridgeMethodSets
};
