const { descriptorFor } = require('./manifest');
const { assemblePropertyList } = require('./property-list');
const GrpcMetadataStore = require('./stores/grpc-metadata-store');
const CookieJarStore = require('./stores/cookie-jar-store');
const RequestHeaderStore = require('./stores/request-header-store');
const ArrayStore = require('./stores/array-store');

/**
 * createPropertyList — the single entry point through which every scripting surface
 * constructs its property list. Consumers pass the surface's manifest `path` and the
 * wiring its store needs; the dispatcher builds the store and hands descriptor + store
 * to `assemblePropertyList`.
 *
 * Wiring shapes per path:
 *   'bru.cookies'                  { getUrl, interpolate, createCookieJar, getCookiesForUrl }
 *   'req.headerList'               { source }  — the raw request config object
 *   'res.headerList'               { source }  — the response object (may be null)
 *   'bru.grpc.request.metadata'    { readMetadata, writable }
 *   'bru.grpc.response.metadata'   { readMetadata }
 *   'bru.grpc.response.trailers'   { readMetadata }
 */

const grpcMetadataDispatcher = (descriptor, wiring) =>
  assemblePropertyList(descriptor, new GrpcMetadataStore(wiring.readMetadata), { writable: wiring.writable });

const DISPATCHERS = {
  'bru.cookies': (descriptor, wiring) => assemblePropertyList(descriptor, new CookieJarStore(wiring)),
  'req.headerList': (descriptor, wiring) => assemblePropertyList(descriptor, new RequestHeaderStore(wiring.source)),
  'res.headerList': (descriptor, wiring) => {
    const rawHeaders = (wiring.source && wiring.source.headers) || {};
    const items = Object.entries(rawHeaders).map(([key, value]) => ({ key, value }));
    return assemblePropertyList(descriptor, new ArrayStore(items));
  },
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
