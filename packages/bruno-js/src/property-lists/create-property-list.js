const { descriptorFor } = require('./manifest');
const { assemblePropertyList } = require('./property-list');
const GrpcMetadataStore = require('./stores/grpc-metadata-store');

/**
 * createPropertyList — the single entry point through which every scripting surface
 * constructs its property list. Consumers pass the surface's manifest `path` and the
 * wiring its store needs; the dispatcher builds the store and hands descriptor + store
 * to `assemblePropertyList`.
 *
 * Wiring shapes per path:
 *   'bru.grpc.request.metadata'    { readMetadata, writable }
 *   'bru.grpc.response.metadata'   { readMetadata }
 *   'bru.grpc.response.trailers'   { readMetadata }
 */

const grpcMetadataDispatcher = (descriptor, wiring) =>
  assemblePropertyList(descriptor, new GrpcMetadataStore(wiring.readMetadata), { writable: wiring.writable });

const DISPATCHERS = {
  'bru.grpc.request.metadata': grpcMetadataDispatcher,
  'bru.grpc.response.metadata': grpcMetadataDispatcher,
  'bru.grpc.response.trailers': grpcMetadataDispatcher
};

const createPropertyList = (path, wiring = {}) => {
  const descriptor = descriptorFor(path);
  const dispatcher = DISPATCHERS[path];
  if (!descriptor || !dispatcher) {
    throw new Error(`Unknown property list path: '${path}'. Add it to the manifest and create-property-list.js.`);
  }
  return dispatcher(descriptor, wiring);
};

module.exports = { createPropertyList };
