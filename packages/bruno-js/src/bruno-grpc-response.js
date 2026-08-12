const { cloneDeep } = require('lodash');
const { toMetadataObject } = require('./grpc-metadata');
const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');

/**
 * Reached from hooks as `bru.grpc.res`.
 *
 * `messages`, `metadata` and `trailers` are the same list types `bru.grpc.req` uses, always
 * read-only here, since the connection has already been completed.
 *
 * Scalar values have interpolated values unlike the req counterpart.
 * Keep quickjs shim up to date on any updates to this class
 */
class BrunoGrpcResponse {
  #res;

  /**
   * @param {object} res - The completed call
   */
  constructor(res) {
    this.#res = res;
    this.statusCode = res.statusCode;
    this.statusMessage = res.statusMessage;
    this.messages = new GrpcMessageList(() => cloneDeep(this.#res.messages) || [], { writable: false });
    this.metadata = new GrpcMetadataList(() => toMetadataObject(this.#res.metadata), { writable: false });
    this.trailers = new GrpcMetadataList(() => toMetadataObject(this.#res.trailers), { writable: false });
    this.duration = res.duration;
    this.methodType = res.methodType;

    // Deliberately a plain object, where HTTP's `BrunoResponse` returns a callable so `res('user.id')`
    // queries the body. gRPC body (messages) will vary based on method type, so skipping here.
  }
}

module.exports = BrunoGrpcResponse;
