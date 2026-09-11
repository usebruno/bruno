const { toMetadataObject } = require('./grpc-metadata');
const { createPropertyList } = require('../property-lists/create-property-list');
const GrpcMessageList = require('./grpc-message-list');
const GrpcMessage = require('./grpc-message');

/**
 * Reached from hooks as `bru.grpc.response`.
 *
 * `messages`, `metadata` and `trailers` are the same list types `bru.grpc.request` uses, always
 * read-only here.
 *
 * Scalar values have interpolated values unlike the request counterpart.
 * Keep quickjs shim up to date on any updates to this class
 */
class BrunoGrpcResponse {
  #response;

  /**
   * @param {object} response - The call so far; complete in `afterCallEnd`, partial in `afterMessageReceive`
   * @param {object} [options]
   * @param {object} [options.message] - The single message just received, as `{ data, timestamp }`.
   *   Supplied only by `afterMessageReceive`
   */
  constructor(response, { message } = {}) {
    this.#response = response;
    this.statusCode = response.statusCode;
    this.statusText = response.statusText;
    this.messages = new GrpcMessageList(response.messages);
    this.metadata = createPropertyList('bru.grpc.response.metadata', {
      readMetadata: () => toMetadataObject(this.#response.metadata)
    });
    this.trailers = createPropertyList('bru.grpc.response.trailers', {
      readMetadata: () => toMetadataObject(this.#response.trailers)
    });
    this.duration = response.duration;

    // Assigned conditionally, as on the request, so `afterCallEnd` has no such property at all.
    if (message) {
      this.message = new GrpcMessage(message);
    }

    // Deliberately a plain object, where HTTP's `BrunoResponse` returns a callable so `res('user.id')`
    // queries the body. gRPC body (messages) will vary based on method type, so skipping here.
  }
}

module.exports = BrunoGrpcResponse;
