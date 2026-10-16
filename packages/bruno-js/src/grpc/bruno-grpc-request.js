const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');
const GrpcMessage = require('./grpc-message');

/*
 * Reached from a hook as `bru.grpc.request`.
 *
 * scalar values are un-interpolated placeholders and become stale values after interpolation
 * similar to the http workflow
 *
 * Keep quickjs shim up to date on any updates to this class
 */

/**
 * The request of a gRPC call: its target, method, metadata and the messages sent.
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
    /**
     * The server address. In `beforeCallStart` its `{{variables}}` are not interpolated yet.
     * @type {string}
     */
    this.url = request.url;
    /**
     * The full name of the method called, such as `/package.Service/Method`.
     * @type {string}
     */
    this.method = request.method;
    /**
     * How the method streams: `'unary'`, `'client-streaming'`, `'server-streaming'` or
     * `'bidi-streaming'`.
     * @type {string}
     */
    this.methodType = request.methodType;
    /**
     * The request's auth mode, such as `'bearer'`, or `'none'`.
     * @type {string}
     */
    this.authMode = request.authMode || 'none';
    /**
     * The path of the `.proto` file the method comes from, or `undefined` when the method comes
     * from server reflection.
     * @type {string | undefined}
     */
    this.protoPath = request.protoPath;
    /**
     * The request's name in the collection.
     * @type {string}
     */
    this.name = request.name;
    /**
     * The call's metadata. It can be changed in `beforeCallStart`; once the call is sent, the
     * methods that change it throw.
     * @type {GrpcMetadataList}
     */
    this.metadata = new GrpcMetadataList(() => this.#metadataEntries(), { writable: metadataWritable });
    // The list clones what it is given, so a hook editing a message cannot reach what the call sent.
    /**
     * The messages the call has sent so far. Empty in `beforeCallStart`.
     * @type {GrpcMessageList}
     */
    this.messages = new GrpcMessageList(sentMessages);
    /**
     * The message about to be sent.
     * @type {GrpcMessage}
     * @context grpc:before-message-send
     */
    this.message;
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
