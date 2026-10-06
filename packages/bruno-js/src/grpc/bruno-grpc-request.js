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
class BrunoGrpcRequest {
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
    /**
     * The server URL, as written in the request: `{{variables}}` are not interpolated.
     * @type {string}
     * @readonly
     * @category Call
     */
    this.url = request.url;
    /**
     * The full method path, such as `'/helloworld.Greeter/SayHello'`.
     * @type {string}
     * @readonly
     * @category Call
     */
    this.method = request.method;
    /**
     * The kind of call.
     * @type {'unary' | 'client-streaming' | 'server-streaming' | 'bidi-streaming'}
     * @readonly
     * @category Call
     */
    this.methodType = request.methodType;
    /**
     * The kind of authentication the call uses, such as `'bearer'`, or `'none'`.
     * @type {string}
     * @readonly
     * @category Call
     */
    this.authMode = request.authMode || 'none';
    /**
     * The path of the `.proto` file the call uses, or `undefined` with server reflection.
     * @type {string | undefined}
     * @readonly
     * @category Call
     */
    this.protoPath = request.protoPath;
    /**
     * The request's name, as shown in the sidebar.
     * @type {string}
     * @readonly
     * @category Call
     */
    this.name = request.name;
    // The list edits `request.headerEntries` and projects into `request.headers`, the object the
    // gRPC client builds call metadata from once the hook returns.
    /**
     * The call's metadata. It can only be changed in `beforeCallStart`, before the call is sent.
     * @example
     * bru.grpc.request.metadata.upsert('authorization', `Bearer ${bru.getVar('token')}`);
     * @readonly
     * @category Metadata
     */
    this.metadata = new GrpcMetadataList(request, { writable: metadataWritable });
    // The list clones what it is given, so a hook editing a message cannot reach what the call sent.
    /**
     * The messages the call has sent so far; empty in `beforeCallStart`.
     * @readonly
     * @category Messages
     */
    this.messages = new GrpcMessageList(sentMessages);
    /**
     * The message about to be sent.
     * @type {GrpcMessage}
     * @readonly
     * @context grpc:before-message-send
     * @category Messages
     */
    this.message;
    if (message) {
      this.message = new GrpcMessage(message);
    }
  }
}

module.exports = BrunoGrpcRequest;
