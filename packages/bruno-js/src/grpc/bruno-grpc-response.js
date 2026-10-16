const { toMetadataObject } = require('./grpc-metadata');
const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');
const GrpcMessage = require('./grpc-message');

/*
 * Reached from hooks as `bru.grpc.response`.
 *
 * `messages`, `metadata` and `trailers` are the same list types `bru.grpc.request` uses, always
 * read-only here.
 *
 * Scalar values have interpolated values unlike the request counterpart.
 * Keep quickjs shim up to date on any updates to this class
 */

/**
 * What the server of a gRPC call has answered so far: status, metadata, trailers and messages.
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
    /**
     * The gRPC status code, `0` for OK. `undefined` while the call is still open.
     * @type {number | undefined}
     */
    this.statusCode = response.statusCode;
    /**
     * The status message. `undefined` while the call is still open.
     * @type {string | undefined}
     */
    this.statusText = response.statusText;
    /**
     * The messages received so far.
     * @type {GrpcMessageList}
     */
    this.messages = new GrpcMessageList(response.messages);
    /**
     * The metadata the server sent before its messages.
     * @type {import('./grpc-metadata-list').ReadOnlyGrpcMetadataList}
     */
    this.metadata = new GrpcMetadataList(() => toMetadataObject(this.#response.metadata), { writable: false });
    /**
     * The metadata the server sent at the end of the call. Empty while the call is still open.
     * @type {import('./grpc-metadata-list').ReadOnlyGrpcMetadataList}
     */
    this.trailers = new GrpcMetadataList(() => toMetadataObject(this.#response.trailers), { writable: false });
    /**
     * How long the call took, in milliseconds. `undefined` while the call is still open.
     * @type {number | undefined}
     */
    this.duration = response.duration;

    /**
     * The message just received. It is also the last of `messages`.
     * @type {GrpcMessage}
     * @context grpc:after-message-receive
     */
    this.message;
    // Assigned conditionally, as on the request, so `afterCallEnd` has no such property at all.
    if (message) {
      this.message = new GrpcMessage(message);
    }

    // Deliberately a plain object, where HTTP's `BrunoResponse` returns a callable so `res('user.id')`
    // queries the body. gRPC body (messages) will vary based on method type, so skipping here.
  }
}

module.exports = BrunoGrpcResponse;
