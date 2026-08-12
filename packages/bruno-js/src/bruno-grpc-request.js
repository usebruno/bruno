const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');

/**
 * Reached from a hook as `bru.grpc.req`.
 *
 * scalar values are un-interpolated placeholders and become stale values after interpolation
 * similar to the http workflow
 *
 * Keep quickjs shim up to date on any updates to this class
 */
class BrunoGrpcRequest {
  #req;

  /**
   * @param {object} req - The prepared gRPC request
   * @param {object} [options]
   * @param {boolean} [options.metadataWritable=false] - When true, `metadata` accepts writes
   * @param {boolean} [options.messagesWritable=false] - When true, `messages` accepts writes
   * @param {object[]} [options.sentMessages] - What the call sent, as `{ data, timestamp }`. Given
   *   by `afterCallEnd`, where `messages` answers what went out rather than what was authored —
   *   the two differ whenever the user streams a subset of the authored messages, or none. Mutually
   *   exclusive with `messagesWritable`: what was sent can no longer be changed.
   */
  constructor(req, { metadataWritable = false, messagesWritable = false, sentMessages } = {}) {
    this.#req = req;
    this.url = req.url;
    this.method = req.method;
    this.methodType = req.methodType;
    this.authMode = req.authMode || 'none';
    this.protoPath = req.protoPath;
    this.name = req.name;
    this.metadata = new GrpcMetadataList(() => this.#metadataEntries(), { writable: metadataWritable });
    // The sent messages arrive as the `{ data, timestamp }` envelope `res.messages` uses, so they
    // need neither conversion nor the live `body.grpc` reference the authored list keeps for writes.
    this.messages = sentMessages
      ? new GrpcMessageList(() => sentMessages, { writable: false })
      : new GrpcMessageList(() => this.#messageEntries(), {
        writable: messagesWritable,
        // returns payload in { data: PAYLOAD } format
        toValue: (entry) => ({ data: this.#safeParseJSON(entry?.content) }),
        // Creates a Wrapper identical to the messages array in req.body.grpc
        toEntry: (message, existing, index) => ({
          name: existing?.name || `message ${index + 1}`,
          content: typeof message === 'string' ? message : this.#safeStringifyJSON(message)
        })
      });
  }

  // Provides reference for in-memory edits on setters
  #metadataEntries() {
    this.#req.headers ??= {};

    return this.#req.headers;
  }

  // Provides reference for in-memory edits on setters
  #messageEntries() {
    this.#req.body ??= {};

    if (!Array.isArray(this.#req.body.grpc)) {
      this.#req.body.grpc = [];
    }

    return this.#req.body.grpc;
  }

  #safeParseJSON(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  #safeStringifyJSON(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }
}

module.exports = BrunoGrpcRequest;
