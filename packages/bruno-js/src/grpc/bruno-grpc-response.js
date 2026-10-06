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
class BrunoGrpcResponse {
  /**
   * @param {object} response - The call so far; complete in `afterCallEnd`, partial in `afterMessageReceive`
   * @param {object} [options]
   * @param {object} [options.message] - The single message just received, as `{ data, timestamp }`.
   *   Supplied only by `afterMessageReceive`
   */
  constructor(response, { message } = {}) {
    /**
     * The gRPC status code: `0` for OK. `undefined` while the call is still open.
     * @type {number | undefined}
     * @readonly
     * @category Status
     */
    this.statusCode = response.statusCode;
    /**
     * The gRPC status message. `undefined` while the call is still open.
     * @type {string | undefined}
     * @readonly
     * @category Status
     */
    this.statusText = response.statusText;
    /**
     * The messages received so far.
     * @readonly
     * @category Messages
     */
    this.messages = new GrpcMessageList(response.messages);
    // Read-only snapshots of the [{ name, value }] display rows
    /**
     * The metadata the server sent before its first message.
     * @type {import('./grpc-metadata-list').ReadOnlyGrpcMetadataList}
     * @readonly
     * @category Metadata
     */
    this.metadata = new GrpcMetadataList(response.metadata);
    /**
     * The metadata the server sent when it ended the call. Empty while the call is still open.
     * @type {import('./grpc-metadata-list').ReadOnlyGrpcMetadataList}
     * @readonly
     * @category Metadata
     */
    this.trailers = new GrpcMetadataList(response.trailers);
    /**
     * How long the call took, in milliseconds. `undefined` while the call is still open.
     * @type {number | undefined}
     * @readonly
     * @category Status
     */
    this.duration = response.duration;

    /**
     * The message just received; also the last entry of `messages`.
     * @type {GrpcMessage}
     * @readonly
     * @context grpc:after-message-receive
     * @category Messages
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
