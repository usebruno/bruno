const { cloneDeep } = require('lodash');

/*
 * `bru.grpc.request.message` / `bru.grpc.response.message` in the message hooks — the single message
 * being sent or received, as opposed to the `GrpcMessageList` of all of them.
 */

/**
 * A gRPC message and when it was sent or received.
 */
class GrpcMessage {
  /**
   * @param {object} [message]
   * @param {*} [message.data] - The parsed message payload
   * @param {number} [message.timestamp] - Epoch ms
   */
  constructor({ data, timestamp } = {}) {
    // Cloned for immutability during script execution
    /**
     * The message's content, as an object.
     *
     * It is a copy: changing it does not change the message the call sends or received.
     * @type {any}
     * @readonly
     * @category Message
     */
    this.data = cloneDeep(data);
    /**
     * When the message was sent or received, in milliseconds since the epoch.
     * @type {number | undefined}
     * @readonly
     * @category Message
     */
    this.timestamp = timestamp;
  }
}

module.exports = GrpcMessage;
