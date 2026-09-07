const { cloneDeep } = require('lodash');
const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');
const GrpcMessage = require('./grpc-message');

/**
 * Reached from a hook as `bru.grpc.request`.
 *
 * scalar values are un-interpolated placeholders and become stale values after interpolation
 * similar to the http workflow
 *
 * Keep quickjs shim up to date on any updates to this class
 */
class BrunoGrpcRequest {
  #request;

  /**
   * @param {object} request - The prepared gRPC request
   * @param {object} [options]
   * @param {boolean} [options.metadataWritable=false] - When true, `metadata` accepts writes
   * @param {object[]} [options.sentMessages=[]] - What the call sent, as `{ data, timestamp }`.
   *   `messages` always answers with these, never with the messages authored in the UI — the two
   *   differ whenever the user streams a subset of the authored messages, or none. It is therefore
   *   empty in `beforeCallStart`, where the call has yet to send anything.
   * @param {object} [options.message] - The single message about to be sent, as `{ data, timestamp }`.
   *   Supplied only by `beforeMessageSend`; in the call hooks the `message` property is absent from
   *   the model entirely, so `'message' in bru.grpc.request` is `false` there.
   */
  constructor(request, { metadataWritable = false, sentMessages = [], message } = {}) {
    this.#request = request;
    this.url = request.url;
    this.method = request.method;
    this.methodType = request.methodType;
    this.authMode = request.authMode || 'none';
    this.protoPath = request.protoPath;
    this.name = request.name;
    this.metadata = new GrpcMetadataList(() => this.#metadataEntries(), { writable: metadataWritable });
    // Cloned on every read, as `response.messages` is, so a hook editing a message cannot reach
    // what the call actually sent.
    this.messages = new GrpcMessageList(() => cloneDeep(sentMessages));
    if (message) {
      this.message = new GrpcMessage(message);
    }
  }

  // Provides reference for in-memory edits on setters
  #metadataEntries() {
    this.#request.headers ??= {};

    return this.#request.headers;
  }
}

module.exports = BrunoGrpcRequest;
