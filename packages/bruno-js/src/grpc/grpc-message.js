const { cloneDeep } = require('lodash');

/**
 * `bru.grpc.request.message` / `bru.grpc.response.message` in the message hooks — the single message
 * being sent or received, as opposed to the `GrpcMessageList` of all of them.
 */
class GrpcMessage {
  /**
   * @param {object} [message]
   * @param {*} [message.data] - The parsed message payload
   * @param {number} [message.timestamp] - Epoch ms
   */
  constructor({ data, timestamp } = {}) {
    // Cloned for immutability during script execution
    this.data = cloneDeep(data);
    this.timestamp = timestamp;
  }
}

module.exports = GrpcMessage;
